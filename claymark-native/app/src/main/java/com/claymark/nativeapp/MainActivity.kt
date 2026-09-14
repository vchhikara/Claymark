package com.claymark.nativeapp

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.claymark.nativeapp.documents.DocumentBackend
import com.claymark.nativeapp.session.DocumentSession
import com.claymark.nativeapp.session.PickerRequest
import com.claymark.nativeapp.theme.ClaymarkTheme

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

                ClaymarkApp(session)
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
