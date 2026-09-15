package com.claymark.nativeapp.session

import android.app.Application
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.claymark.nativeapp.documents.DocumentBackend
import com.claymark.nativeapp.documents.DocumentRef
import com.claymark.nativeapp.documents.DocumentSourceKind
import com.claymark.nativeapp.documents.DraftStore
import com.claymark.nativeapp.documents.DynamicShortcuts
import com.claymark.nativeapp.documents.RecentFile
import com.claymark.nativeapp.documents.RecentFilesStore
import com.claymark.nativeapp.documents.PersistAction
import com.claymark.nativeapp.documents.RecoveryDraft
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Port of `src/hooks/useDocumentSession.ts`.
 *
 * Same hand-rolled state machine, same single source of truth: `mode` is what
 * every action funnels through, so an invalid combination (saving with no
 * document, say) isn't representable.
 */
enum class SessionMode { NO_DOCUMENT, VIEWING, EDITING, SAVING, SAVE_FAILED }

enum class SaveStatus { CLEAN, DIRTY, SAVING, SAVED, FAILED }

/**
 * A pending action queued behind an unsaved-changes confirmation. Back and
 * Open file both resolve through the same Save/Discard/Cancel prompt.
 */
enum class AbandonReason { BACK, OPEN_FILE }

enum class AbandonChoice { SAVE, DISCARD, CANCEL }

/** What the UI should ask the host activity to launch, if anything. */
sealed interface PickerRequest {
    data object Open : PickerRequest
    data class Create(val suggestedName: String) : PickerRequest
}

private const val DRAFT_DEBOUNCE_MS = 700L
private const val AUTOSAVE_DEBOUNCE_MS = 1200L

class DocumentSession(app: Application) : AndroidViewModel(app) {

    private val backend = DocumentBackend(app)
    private val drafts = DraftStore(app)
    private val recentFilesStore = RecentFilesStore(app)

    var mode by mutableStateOf(SessionMode.NO_DOCUMENT)
        private set
    var ref by mutableStateOf<DocumentRef?>(null)
        private set
    var text by mutableStateOf("")
        private set
    var saveStatus by mutableStateOf(SaveStatus.CLEAN)
        private set
    var saveError by mutableStateOf<String?>(null)
        private set
    var pendingAbandon by mutableStateOf<AbandonReason?>(null)
        private set
    var persistAction by mutableStateOf<PersistAction?>(null)
        private set
    var recoveredDraft by mutableStateOf(false)
        private set

    /** Non-null while the shell should be showing a system picker. */
    var pickerRequest by mutableStateOf<PickerRequest?>(null)
        private set

    val isEditing: Boolean
        get() = mode == SessionMode.EDITING || mode == SessionMode.SAVING || mode == SessionMode.SAVE_FAILED

    val hasDocument: Boolean get() = mode != SessionMode.NO_DOCUMENT

    /**
     * True for the brief window between `MainActivity` capturing a VIEW
     * intent's URI (or a SEND intent's shared text) and [openLaunchDocument]
     * finishing the async load — the welcome screen (§7.2) checks this so a
     * cold "Open with"/"Share to Claymark" launch never flashes the welcome
     * screen before the real content appears.
     */
    val hasPendingLaunch: Boolean get() = launchUri != null || pendingSharedText != null

    /** The last-known-saved text. Dirty is `text != persistedText`. */
    private var persistedText: String = ""
    private var draftJob: Job? = null
    private var autosaveJob: Job? = null

    /**
     * Settings-backed, defaults to the Settings screen's own default (on).
     * Set from the Compose layer via [setAutosaveEnabled] once `SettingsStore`
     * is read — this ViewModel has no Compose/CompositionLocal access of its
     * own.
     */
    private var autosaveEnabled: Boolean = true

    fun setAutosaveEnabled(enabled: Boolean) {
        autosaveEnabled = enabled
    }

    /** Awaited by a save that had to route through the create-document picker. */
    private var pendingCreate: CompletableDeferred<Uri?>? = null

    /** Awaited by an open that had to route through the open-document picker. */
    private var pendingOpen: CompletableDeferred<Uri?>? = null

    /**
     * Set by [openRecent] when a dirty buffer routes it through the same
     * unsaved-changes prompt as [openFile] — non-null tells
     * [resolveAbandon] which URI to reopen once the user decides, instead of
     * launching the picker [openFile] would.
     */
    private var pendingRecentUri: String? = null

    /** Set once by MainActivity when a VIEW intent arrives. */
    private var launchUri: Uri? = null
    private var launchUriConsumed = false

    /** Set once by MainActivity when a SEND (share-target) intent arrives. */
    private var pendingSharedText: String? = null
    private var pendingSharedTextConsumed = false

    // ---- drafts -----------------------------------------------------------

    private fun flushDraft(target: DocumentRef, value: String) {
        if (value == persistedText) {
            // Back to the last saved state — no draft needed, and an old one
            // would otherwise wrongly survive as "recoverable".
            drafts.remove(target.id)
            return
        }
        drafts.put(
            RecoveryDraft(
                documentId = target.id,
                displayName = target.name,
                text = value,
                draftModifiedAt = System.currentTimeMillis(),
            ),
        )
    }

    private fun scheduleDraftFlush(target: DocumentRef, value: String) {
        draftJob?.cancel()
        draftJob = viewModelScope.launch {
            delay(DRAFT_DEBOUNCE_MS)
            flushDraft(target, value)
        }
    }

    /**
     * Flush immediately, no debounce, at the must-not-lose moment. The web
     * build hooked `visibilitychange`; the Android equivalent is ON_STOP,
     * wired up in ClaymarkApp.
     */
    fun flushDraftNow() {
        val target = ref ?: return
        if (text != persistedText) flushDraft(target, text)
    }

    // ---- opening ----------------------------------------------------------

    /**
     * [recordRecent] must be false for a source whose URI grant isn't
     * persisted (an "Open with" `openIncoming` URI) or that has no real
     * handle at all (synthetic shared-text ref) — see [RecentFilesStore]'s
     * own doc comment for why either would be a broken shortcut later.
     */
    private fun applyOpenedDoc(newRef: DocumentRef, loaded: String, recordRecent: Boolean = true) {
        persistedText = loaded
        val existing = drafts.get(newRef.id)
        val recovered = existing != null && existing.text != loaded
        mode = SessionMode.VIEWING
        ref = newRef
        text = if (recovered) existing!!.text else loaded
        saveStatus = if (recovered) SaveStatus.DIRTY else SaveStatus.CLEAN
        saveError = null
        pendingAbandon = null
        persistAction = backend.persistAction(newRef)
        recoveredDraft = recovered
        if (recordRecent && newRef.handle.isNotEmpty()) {
            recentFilesStore.record(newRef.handle, newRef.name)
            refreshDynamicShortcuts()
        }
    }

    /** §1.2/§1.1: keep the launcher's dynamic shortcuts and the §1.1 home
     *  screen widget in sync with the MRU list every time it changes —
     *  same data §2.3's drawer list reads, three surfaces off one store. */
    private fun refreshDynamicShortcuts() {
        val app = getApplication<Application>()
        DynamicShortcuts.update(app, recentFilesStore.list())
        viewModelScope.launch { com.claymark.nativeapp.widget.ClaymarkWidget.refreshAll(app) }
    }

    fun listRecentFiles(): List<RecentFile> = recentFilesStore.list()

    /**
     * The actual picker + load, with no dirty gate. Called directly by
     * [openFile] once the buffer is known clean, and by [resolveAbandon] once
     * the user has already decided — re-checking dirty state there would
     * wrongly re-gate on a snapshot that is already stale.
     */
    private suspend fun performOpen() {
        val deferred = CompletableDeferred<Uri?>()
        pendingOpen = deferred
        pickerRequest = PickerRequest.Open
        val uri = deferred.await()
        pendingOpen = null
        if (uri == null) return
        try {
            val snapshot = withContext(Dispatchers.IO) { backend.openPicked(uri) }
            applyOpenedDoc(snapshot.ref, snapshot.text)
        } catch (error: Exception) {
            mode = if (ref == null) SessionMode.NO_DOCUMENT else mode
            saveError = error.message ?: error.toString()
        }
    }

    fun openFile() {
        viewModelScope.launch {
            if (mode == SessionMode.EDITING && saveStatus == SaveStatus.DIRTY) {
                pendingRecentUri = null
                pendingAbandon = AbandonReason.OPEN_FILE
                return@launch // resolveAbandon calls performOpen() once decided
            }
            performOpen()
        }
    }

    /** A tap on a §2.3 recent-files row — same dirty gate as [openFile], but
     *  reopens [uri] directly instead of launching the system picker. */
    fun openRecent(uri: String) {
        viewModelScope.launch {
            if (mode == SessionMode.EDITING && saveStatus == SaveStatus.DIRTY) {
                pendingRecentUri = uri
                pendingAbandon = AbandonReason.OPEN_FILE
                return@launch // resolveAbandon calls performOpenRecent() once decided
            }
            performOpenRecent(uri)
        }
    }

    private suspend fun performOpenRecent(uri: String) {
        try {
            val snapshot = withContext(Dispatchers.IO) { backend.openRecent(uri) }
            applyOpenedDoc(snapshot.ref, snapshot.text)
        } catch (error: Exception) {
            mode = if (ref == null) SessionMode.NO_DOCUMENT else mode
            saveError = error.message ?: error.toString()
            recentFilesStore.remove(uri)
        }
    }

    fun setLaunchUri(uri: Uri) {
        launchUri = uri
        launchUriConsumed = false
    }

    fun setSharedText(text: String) {
        pendingSharedText = text
        pendingSharedTextConsumed = false
    }

    /**
     * "Open with" / share-target support: checked once on start for a
     * just-launched external document URI or shared text. Never gated on
     * dirty state — a cold-start VIEW/SEND intent only ever runs against the
     * fresh NO_DOCUMENT state, so there is nothing to lose yet.
     */
    fun openLaunchDocument() {
        val uri = launchUri
        if (uri != null && !launchUriConsumed) {
            launchUriConsumed = true
            launchUri = null
            viewModelScope.launch {
                try {
                    val snapshot = withContext(Dispatchers.IO) { backend.openIncoming(uri) }
                    applyOpenedDoc(snapshot.ref, snapshot.text, recordRecent = false)
                } catch (error: Exception) {
                    saveError = error.message ?: error.toString()
                }
            }
            return
        }

        val shared = pendingSharedText
        if (shared != null && !pendingSharedTextConsumed) {
            pendingSharedTextConsumed = true
            pendingSharedText = null
            openSharedText(shared)
        }
    }

    /**
     * Shared text has no backing file at all — a synthetic, non-writable
     * [DocumentRef] with a stable id (so a crash mid-edit is still
     * recoverable via [DraftStore], same as any other document) routes Save
     * through the create-document picker on first save
     * ([DocumentBackend.persistAction] returns SAVE_AS whenever `writable`
     * is false), exactly like a document opened from a read-only provider.
     * The ref's `handle` is never dereferenced before that picker supplies a
     * real URI, so leaving it blank is safe.
     */
    private fun openSharedText(text: String) {
        val newRef = DocumentRef(
            id = "shared-text",
            name = "Shared text.md",
            mimeType = "text/markdown",
            writable = false,
            sourceKind = DocumentSourceKind.CONTENT_URI,
            handle = "",
        )
        applyOpenedDoc(newRef, text, recordRecent = false)
    }

    // ---- editing ----------------------------------------------------------

    fun startEdit() {
        if (mode == SessionMode.VIEWING) mode = SessionMode.EDITING
    }

    fun backToPreview() {
        // SAVE_FAILED is reachable here too: "Back to preview" is visible
        // whenever isEditing is true, which includes SAVE_FAILED. A failed
        // save always means the buffer still differs from disk, so route it
        // through the same abandon prompt as a dirty buffer rather than
        // no-op'ing (which left the user stuck) or silently discarding.
        if (mode != SessionMode.EDITING && mode != SessionMode.SAVE_FAILED) return
        if (saveStatus == SaveStatus.DIRTY || saveStatus == SaveStatus.FAILED) {
            pendingAbandon = AbandonReason.BACK
            return
        }
        mode = SessionMode.VIEWING
    }

    fun updateText(next: String) {
        if (mode != SessionMode.EDITING) return
        val target = ref ?: return
        text = next
        saveStatus = if (next == persistedText) SaveStatus.CLEAN else SaveStatus.DIRTY
        scheduleDraftFlush(target, next)
        scheduleAutosave(target, next)
    }

    /**
     * Debounced write to the actual open document — distinct from
     * [scheduleDraftFlush]'s always-on crash-recovery buffer, which this
     * setting does not gate.
     *
     * Guarded to targets that write in place ([backend.persistAction] ==
     * `SAVE`): a target needing Save-as would otherwise pop the system
     * "create document" picker unannounced, mid-keystroke, which is a much
     * louder interruption than autosave is supposed to be. Such a document
     * simply doesn't autosave; the explicit Save/Save-as buttons still work.
     */
    private fun scheduleAutosave(target: DocumentRef, value: String) {
        if (!autosaveEnabled) return
        if (backend.persistAction(target) != PersistAction.SAVE) return
        autosaveJob?.cancel()
        autosaveJob = viewModelScope.launch {
            delay(AUTOSAVE_DEBOUNCE_MS)
            // Re-check on wake: mode/target/text may have moved on (explicit
            // Save, Save-as, a fresh edit already superseding this one).
            if (ref?.id == target.id && text == value && saveStatus == SaveStatus.DIRTY) {
                doSave(target, value, asNew = false)
            }
        }
    }

    // ---- saving -----------------------------------------------------------

    private suspend fun doSave(target: DocumentRef, snapshotText: String, asNew: Boolean) {
        if (ref?.id != target.id) return
        mode = SessionMode.SAVING
        saveStatus = SaveStatus.SAVING
        saveError = null
        try {
            var nextRef = target
            if (asNew || backend.persistAction(target) == PersistAction.SAVE_AS) {
                val deferred = CompletableDeferred<Uri?>()
                pendingCreate = deferred
                pickerRequest = PickerRequest.Create(backend.suggestedNameFor(target))
                val destination = deferred.await()
                pendingCreate = null
                if (destination == null) {
                    // Cancelled the Save-as dialog — back to editing, buffer intact.
                    if (ref?.id == target.id) {
                        mode = SessionMode.EDITING
                        saveStatus = SaveStatus.DIRTY
                    }
                    return
                }
                nextRef = withContext(Dispatchers.IO) {
                    backend.saveAsCreated(destination, snapshotText)
                }
            } else {
                withContext(Dispatchers.IO) { backend.save(target, snapshotText) }
            }
            // Save-race guard: only clear dirty if the buffer hasn't moved
            // past the snapshot just persisted.
            persistedText = snapshotText
            drafts.remove(target.id)
            mode = SessionMode.VIEWING
            ref = nextRef
            recentFilesStore.record(nextRef.handle, nextRef.name)
            refreshDynamicShortcuts()
            saveStatus = if (text == snapshotText) SaveStatus.SAVED else SaveStatus.DIRTY
            persistAction = backend.persistAction(nextRef)
        } catch (error: Exception) {
            if (ref?.id == target.id) {
                mode = SessionMode.SAVE_FAILED
                saveStatus = SaveStatus.FAILED
                saveError = error.message ?: error.toString()
            }
        }
    }

    fun save() {
        val target = ref ?: return
        viewModelScope.launch { doSave(target, text, asNew = false) }
    }

    fun saveAs() {
        val target = ref ?: return
        viewModelScope.launch { doSave(target, text, asNew = true) }
    }

    /**
     * Unreachable on this backend, exactly as on Tauri: there is always a
     * real writable destination available through Save-as. Kept so the
     * PersistAction contract stays complete rather than silently narrowed.
     */
    fun downloadCopy() {
        throw UnsupportedOperationException(
            "downloadCopy is not applicable on Android — use Save as.",
        )
    }

    fun resolveAbandon(choice: AbandonChoice) {
        val reason = pendingAbandon ?: return
        val target = ref ?: return
        when (choice) {
            AbandonChoice.CANCEL -> pendingAbandon = null

            AbandonChoice.DISCARD -> {
                drafts.remove(target.id)
                text = persistedText
                saveStatus = SaveStatus.CLEAN
                pendingAbandon = null
                if (reason == AbandonReason.BACK) mode = SessionMode.VIEWING
                if (reason == AbandonReason.OPEN_FILE) {
                    val recentUri = pendingRecentUri
                    pendingRecentUri = null
                    viewModelScope.launch {
                        if (recentUri != null) performOpenRecent(recentUri) else performOpen()
                    }
                }
            }

            AbandonChoice.SAVE -> viewModelScope.launch {
                doSave(target, text, asNew = false)
                pendingAbandon = null
                if (reason == AbandonReason.BACK) mode = SessionMode.VIEWING
                if (reason == AbandonReason.OPEN_FILE) {
                    val recentUri = pendingRecentUri
                    pendingRecentUri = null
                    if (recentUri != null) performOpenRecent(recentUri) else performOpen()
                }
            }
        }
    }

    fun discardRecoveredDraft() {
        val target = ref ?: return
        drafts.remove(target.id)
        text = persistedText
        saveStatus = SaveStatus.CLEAN
        recoveredDraft = false
    }

    // ---- picker plumbing --------------------------------------------------

    fun onPickerLaunched() {
        pickerRequest = null
    }

    fun onOpenPicked(uri: Uri?) {
        pendingOpen?.complete(uri)
    }

    fun onCreatePicked(uri: Uri?) {
        pendingCreate?.complete(uri)
    }
}
