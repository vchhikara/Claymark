use tauri::Emitter;

// Phase 5.1 (android-to-desktop-checklist.md §3/§5): the OS "open with" /
// file-association launch path. On Linux/Windows the launched path arrives
// as a CLI argument; on macOS it arrives via RunEvent::Opened instead. Both
// route through the same 'claymark://open-file' event so the frontend has a
// single listener rather than two launch paths to reconcile.
fn emit_open_file(app: &tauri::AppHandle, path: String) {
  let _ = app.emit("claymark://open-file", path);
}

fn markdown_path_from_args(args: &[String]) -> Option<String> {
  args.iter().skip(1).find(|arg| {
    let lower = arg.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
  }).cloned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Linux/Windows: the OS passes the opened file's path as argv[1+].
      if let Some(path) = markdown_path_from_args(&std::env::args().collect::<Vec<_>>()) {
        let handle = app.handle().clone();
        // Deferred so the frontend's listener (registered on mount) is
        // attached before the event fires.
        std::thread::spawn(move || {
          std::thread::sleep(std::time::Duration::from_millis(300));
          emit_open_file(&handle, path);
        });
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {
      // macOS/iOS/Android: the OS delivers "open with" as a RunEvent, not
      // argv, via a variant only compiled on those targets — Linux/Windows
      // use the argv path handled in setup() above instead.
      #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
      if let tauri::RunEvent::Opened { urls } = _event {
        if let Some(url) = urls.into_iter().next() {
          if let Ok(path) = url.to_file_path() {
            emit_open_file(_app_handle, path.to_string_lossy().into_owned());
          }
        }
      }
    });
}
