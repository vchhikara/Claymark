use tauri::Manager;

#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;

// Real-device finding (P0 filename-display bug, POCO M2 Pro): a document
// opened via Android's "Documents"/"Recent" drawer arrives at
// src/documents/backends/tauri.ts as a
// content://com.android.providers.media.documents/document/... URI with no
// filename embedded anywhere in the URI itself (unlike the direct
// content://.../primary:Download/... route, where basename()'s naive
// split-on-"/" already works). The only way to recover a real name is to
// ask the platform's ContentResolver for OpenableColumns.DISPLAY_NAME —
// there's no JS-reachable Tauri API for that, so this is a small inline
// Android plugin wrapping ContentResolverPlugin.kt
// (gen/android/app/src/main/java/com/claymark/app/ContentResolverPlugin.kt).
#[cfg(target_os = "android")]
fn content_resolver_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
  tauri::plugin::Builder::new("content-resolver")
    .setup(|app, api| {
      let handle = api.register_android_plugin("com.claymark.app", "ContentResolverPlugin")?;
      app.manage(handle);
      Ok(())
    })
    .build()
}

#[cfg(target_os = "android")]
#[derive(serde::Serialize)]
struct DisplayNameArgs {
  uri: String,
}

#[cfg(target_os = "android")]
#[derive(serde::Deserialize)]
struct DisplayNameResponse {
  name: Option<String>,
}

/// Looks up a `content://` URI's display name via the Android
/// ContentResolver (`OpenableColumns.DISPLAY_NAME`). Android-only; every
/// other Tauri target returns real filesystem paths that basename() already
/// handles, so this always resolves to `None` there.
#[tauri::command]
async fn get_display_name(app: tauri::AppHandle, uri: String) -> Result<Option<String>, String> {
  #[cfg(target_os = "android")]
  {
    let handle = app.state::<PluginHandle<tauri::Wry>>();
    let response: DisplayNameResponse = handle
      .run_mobile_plugin("getDisplayName", DisplayNameArgs { uri })
      .map_err(|error| error.to_string())?;
    Ok(response.name)
  }
  #[cfg(not(target_os = "android"))]
  {
    let _ = (app, uri);
    Ok(None)
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![get_display_name])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    });

  #[cfg(target_os = "android")]
  let builder = builder.plugin(content_resolver_plugin());

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
