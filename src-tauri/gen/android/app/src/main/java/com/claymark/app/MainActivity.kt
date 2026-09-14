package com.claymark.app

import android.content.Intent
import android.os.Bundle

// "Open with" support (AndroidManifest.xml's VIEW intent-filters on this
// activity): captures the launch/new intent's data URI so JS can pick it up
// via the get_launch_uri command (ContentResolverPlugin.kt) and open it
// through the same refFor()/readTextFile() path as a document picked via the
// in-app "Open" dialog. A companion-object holder is used (rather than an
// event/channel) because the JS side isn't guaranteed to be listening yet
// when a cold-start VIEW intent arrives — polling it once on startup is
// simpler and race-free.
class MainActivity : TauriActivity() {
    companion object {
        @Volatile
        var pendingLaunchUri: String? = null
            private set

        @Synchronized
        fun takePendingLaunchUri(): String? {
            val uri = pendingLaunchUri
            pendingLaunchUri = null
            return uri
        }

        @Synchronized
        private fun capture(intent: Intent?) {
            if (intent?.action == Intent.ACTION_VIEW) {
                intent.data?.let { pendingLaunchUri = it.toString() }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        capture(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        capture(intent)
    }
}
