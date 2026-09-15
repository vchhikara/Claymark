package com.claymark.nativeapp

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.PredictiveBackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.claymark.nativeapp.documents.DocumentBackend
import com.claymark.nativeapp.session.DocumentSession
import com.claymark.nativeapp.session.PickerRequest
import com.claymark.nativeapp.theme.ClaymarkTheme
import com.claymark.nativeapp.theme.colors
import com.claymark.nativeapp.theme.settings
import com.claymark.nativeapp.ui.AboutScreen
import com.claymark.nativeapp.ui.ClaymarkDrawerContent
import com.claymark.nativeapp.ui.HelpScreen
import com.claymark.nativeapp.ui.PrivacyScreen
import com.claymark.nativeapp.ui.SettingsScreen
import com.claymark.nativeapp.ui.WelcomeScreen
import kotlinx.coroutines.launch

/**
 * "Open with" support (see the VIEW intent-filters in AndroidManifest.xml).
 *
 * The Tauri build needed three moving parts for this: a companion-object
 * holder in MainActivity, a `get_launch_uri` Tauri command, and a JS-side
 * poll on startup, because the web layer wasn't guaranteed to be listening
 * when a cold-start VIEW intent arrived. Natively none of that is required —
 * the intent is available before the first composition, so the URI is handed
 * straight to the session.
 */
class MainActivity : ComponentActivity() {

    private val session: DocumentSession by viewModels()

    /** Set when launched via the §1.2 "Open file" static shortcut's
     *  EXTRA_OPEN_FILE intent extra — read once by the composable below,
     *  then left true for the rest of this process (same one-way-door
     *  shape as `showSample`, no reason to re-trigger the picker on a
     *  later recomposition). */
    private var pendingShortcutOpen by mutableStateOf(false)

    private val openLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        session.onOpenPicked(result.data?.data)
    }

    private val createLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        session.onCreatePicked(result.data?.data)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        captureLaunchIntent(intent)

        // The web build flushed the recovery draft on `visibilitychange`.
        // ON_STOP is the Android equivalent must-not-lose moment: it is the
        // last callback guaranteed before the process can be killed.
        lifecycle.addObserver(
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_STOP) session.flushDraftNow()
            },
        )

        setContent {
            ClaymarkTheme {
                val backend = androidx.compose.runtime.remember { DocumentBackend(applicationContext) }
                var route by rememberSaveable { mutableStateOf(Route.READER) }
                // Once true, stays true for the rest of this process — "View
                // sample" is a one-way door into the existing NO_DOCUMENT
                // reader view (ClaymarkApp.kt's SAMPLE_MD), same as opening a
                // real document is.
                var showSample by rememberSaveable { mutableStateOf(false) }
                val drawerState = rememberDrawerState(DrawerValue.Closed)
                val scope = rememberCoroutineScope()

                // The ViewModel has no Compose/CompositionLocal access of its
                // own — this is the one bridge from the Settings-backed
                // preference to the session's debounced autosave.
                val autosaveEnabled = settings.autosaveEnabled
                LaunchedEffect(autosaveEnabled) {
                    session.setAutosaveEnabled(autosaveEnabled)
                }

                LaunchedEffect(Unit) { session.openLaunchDocument() }
                LaunchedEffect(pendingShortcutOpen) {
                    if (pendingShortcutOpen) {
                        pendingShortcutOpen = false
                        session.openFile()
                    }
                }

                LaunchedEffect(session.pickerRequest) {
                    when (val request = session.pickerRequest) {
                        is PickerRequest.Open -> {
                            session.onPickerLaunched()
                            openLauncher.launch(backend.openIntent())
                        }
                        is PickerRequest.Create -> {
                            session.onPickerLaunched()
                            createLauncher.launch(backend.createIntent(request.suggestedName))
                        }
                        null -> Unit
                    }
                }

                // Drawer and sub-screens are mutually exclusive with each
                // other in practice (the hamburger only shows on the reader,
                // and sub-screens have no hamburger of their own), so these
                // two back-press handlers never actually compete for the
                // same press.
                //
                // §1.4: PredictiveBackHandler rather than plain BackHandler —
                // letting the gesture's progress stream through (even though
                // this app doesn't consume it for its own animation) is what
                // lets the system's own predictive-back peek render for
                // ModalNavigationDrawer, instead of the all-or-nothing snap a
                // plain BackHandler produces. A cancelled gesture (released
                // mid-swipe) throws CancellationException out of the
                // `collect`, which is the correct "stay open" outcome — no
                // explicit else-branch needed.
                PredictiveBackHandler(enabled = drawerState.isOpen) { progress ->
                    try {
                        progress.collect { }
                        drawerState.close()
                    } catch (_: kotlinx.coroutines.CancellationException) {
                        // Gesture released before completion — drawer stays open.
                    }
                }
                PredictiveBackHandler(enabled = route != Route.READER) { progress ->
                    try {
                        progress.collect { }
                        route = Route.READER
                    } catch (_: kotlinx.coroutines.CancellationException) {
                        // Gesture released before completion — stay on the sub-screen.
                    }
                }

                // §1.6: on a wide window (foldable unfolded book-posture, a
                // tablet in landscape — the standard ~600dp two-pane
                // threshold), the drawer's content sits permanently in a
                // left column instead of sliding over the document. Below
                // that width, behavior is unchanged: today's phone
                // drawer-over-content pattern, byte-for-byte. `onOpenDrawer`
                // becomes a no-op in the wide branch since there is no
                // drawer left to open — the panel is already visible.
                val isWideWindow = androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp >= 600

                @Composable
                fun ReaderContent(onOpenDrawer: () -> Unit) {
                    when (route) {
                        Route.READER -> if (
                            !session.hasDocument && !session.hasPendingLaunch && !showSample
                        ) {
                            WelcomeScreen(
                                onOpenDrawer = onOpenDrawer,
                                onOpenFile = session::openFile,
                                onViewSample = { showSample = true },
                            )
                        } else {
                            ClaymarkApp(session = session, onOpenDrawer = onOpenDrawer)
                        }
                        Route.SETTINGS -> SettingsScreen(onBack = { route = Route.READER })
                        Route.HELP -> HelpScreen(onBack = { route = Route.READER })
                        Route.ABOUT -> AboutScreen(onBack = { route = Route.READER })
                        Route.PRIVACY -> PrivacyScreen(onBack = { route = Route.READER })
                    }
                }

                if (isWideWindow) {
                    // The hamburger has no drawer to slide over in this
                    // layout — it toggles the permanent panel's own
                    // visibility instead, same affordance as the phone
                    // drawer just applied to a layout that has no gesture to
                    // drive it.
                    var wideDrawerVisible by rememberSaveable { mutableStateOf(true) }
                    androidx.compose.foundation.layout.Row(modifier = androidx.compose.ui.Modifier.fillMaxSize()) {
                        if (wideDrawerVisible) {
                            androidx.compose.foundation.layout.Box(
                                modifier = androidx.compose.ui.Modifier
                                    .width(240.dp)
                                    .fillMaxHeight()
                                    .background(colors.surface),
                            ) {
                                ClaymarkDrawerContent(
                                    currentRoute = route,
                                    onNavigate = { next -> route = next },
                                    recentFiles = session.listRecentFiles(),
                                    onOpenRecent = { uri ->
                                        session.openRecent(uri)
                                        route = Route.READER
                                    },
                                )
                            }
                            androidx.compose.foundation.layout.Box(
                                modifier = androidx.compose.ui.Modifier
                                    .width(1.dp)
                                    .fillMaxHeight()
                                    .background(colors.borderSubtle),
                            )
                        }
                        androidx.compose.foundation.layout.Box(modifier = androidx.compose.ui.Modifier.weight(1f)) {
                            ReaderContent(onOpenDrawer = { wideDrawerVisible = !wideDrawerVisible })
                        }
                    }
                } else {
                    ModalNavigationDrawer(
                        drawerState = drawerState,
                        gesturesEnabled = route == Route.READER && !session.isEditing,
                        scrimColor = Color.Black.copy(alpha = 0.5f),
                        drawerContent = {
                            // A bare re-skin: no M3 tonal elevation (it would tint
                            // our surface with the unthemed baseline scheme's
                            // primary) and no default rounded-end shape.
                            ModalDrawerSheet(
                                drawerShape = RectangleShape,
                                drawerContainerColor = colors.surface,
                                drawerContentColor = colors.textPrimary,
                                drawerTonalElevation = 0.dp,
                                windowInsets = androidx.compose.foundation.layout.WindowInsets(0, 0, 0, 0),
                            ) {
                                ClaymarkDrawerContent(
                                    currentRoute = route,
                                    onNavigate = { next ->
                                        route = next
                                        scope.launch { drawerState.close() }
                                    },
                                    recentFiles = session.listRecentFiles(),
                                    onOpenRecent = { uri ->
                                        session.openRecent(uri)
                                        route = Route.READER
                                        scope.launch { drawerState.close() }
                                    },
                                )
                            }
                        },
                    ) {
                        ReaderContent(onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureLaunchIntent(intent)
        session.openLaunchDocument()
    }

    private fun captureLaunchIntent(intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_VIEW -> intent.data?.let { session.setLaunchUri(it) }
            Intent.ACTION_SEND -> {
                val text = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (!text.isNullOrEmpty()) session.setSharedText(text)
            }
            Intent.ACTION_MAIN -> {
                if (intent.getBooleanExtra(EXTRA_OPEN_FILE, false)) pendingShortcutOpen = true
            }
        }
    }

    private companion object {
        const val EXTRA_OPEN_FILE = "com.claymark.nativeapp.EXTRA_OPEN_FILE"
    }
}
