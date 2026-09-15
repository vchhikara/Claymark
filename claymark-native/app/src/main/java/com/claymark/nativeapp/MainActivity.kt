package com.claymark.nativeapp

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
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
                BackHandler(enabled = drawerState.isOpen) {
                    scope.launch { drawerState.close() }
                }
                BackHandler(enabled = route != Route.READER) {
                    route = Route.READER
                }

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
                            )
                        }
                    },
                ) {
                    when (route) {
                        Route.READER -> ClaymarkApp(
                            session = session,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                        )
                        Route.SETTINGS -> SettingsScreen(onBack = { route = Route.READER })
                        Route.HELP -> HelpScreen(onBack = { route = Route.READER })
                        Route.ABOUT -> AboutScreen(onBack = { route = Route.READER })
                        Route.PRIVACY -> PrivacyScreen(onBack = { route = Route.READER })
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
        if (intent?.action != Intent.ACTION_VIEW) return
        intent.data?.let { session.setLaunchUri(it) }
    }
}
