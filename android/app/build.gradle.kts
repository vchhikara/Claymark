import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// §5/HANDOFF-2.md §5: release signing config, sourced from an untracked
// keystore.properties (see keystore.properties.example) rather than any
// key material committed here. Until that file exists with real values,
// `release` builds stay unsigned exactly as before — this wires up the
// plumbing without fabricating production credentials, which is a real
// decision for whoever owns the actual signing key, not something to
// generate blind.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) keystorePropertiesFile.inputStream().use { load(it) }
}
val hasReleaseSigning = keystorePropertiesFile.exists() &&
    keystoreProperties.getProperty("storeFile") != null

android {
    // The Java package the R/BuildConfig classes are generated into. NOT
    // `com.claymark.native` — `native` is a reserved Java keyword, so a
    // package segment of that name doesn't compile. The applicationId below
    // is what actually distinguishes this build from the Tauri APK on-device.
    namespace = "com.claymark.nativeapp"
    compileSdk = 35

    defaultConfig {
        // Deliberately different from the Tauri shell's `com.claymark.app`
        // so both can be installed side by side and compared on one device.
        applicationId = "com.claymark.nativeapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // No shrinking: the app has no server-driven code paths and the
            // reflection-free Compose/commonmark surface gains little, while
            // an aggressive default risks stripping the WebView JS bridge.
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-text")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.documentfile:documentfile:1.0.1")
    implementation("androidx.webkit:webkit:1.12.1")

    // CommonMark + the GFM extensions the shipped pipeline enables through
    // remark-gfm: tables, strikethrough, task lists, autolinks.
    implementation("org.commonmark:commonmark:0.24.0")
    implementation("org.commonmark:commonmark-ext-gfm-tables:0.24.0")
    implementation("org.commonmark:commonmark-ext-gfm-strikethrough:0.24.0")
    implementation("org.commonmark:commonmark-ext-task-list-items:0.24.0")
    implementation("org.commonmark:commonmark-ext-autolink:0.24.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.compose.ui:ui-tooling-preview")

    // HANDOFF-2.md §5: "zero tests in the native port... UrlPolicy.safeUrl
    // named as highest-value first target — it's the actual security
    // boundary." Plain JVM tests only (no Robolectric) — `safeUrl`/
    // `isExternal` touch only `java.net`, not the Android framework, so a
    // real unit-test module doesn't need the heavier instrumented setup to
    // start covering the actual trust boundary.
    testImplementation("junit:junit:4.13.2")

    // §1.1: Jetpack Glance — the current (non-deprecated) home-screen-widget
    // API, Compose-style code translated to RemoteViews. No INTERNET usage;
    // reads the same locally-persisted "last opened doc" record §2.3's
    // recent-files list already maintains.
    implementation("androidx.glance:glance-appwidget:1.1.1")
}
