fn main() {
  // DEF-009: Android requires every .so in an APK to use 16 KB ELF segment
  // alignment (mandatory on 16 KB page-size devices, and for Play Store
  // targeting API 35+ from Nov 2025); the default linker output here uses
  // 4 KB (0x1000). A `.cargo/config.toml` `rustflags` entry can't fix this
  // for an android build driven by `tauri android build`/`dev`: tauri-cli
  // force-sets `CARGO_TARGET_<TRIPLE>_LINKER` and `_RUSTFLAGS` itself right
  // before spawning `cargo build` for each Android target, which overrides
  // both the environment and any config.toml value for that exact target
  // (same cargo config key, env wins). `cargo:rustc-link-arg` from a build
  // script is a separate, additive mechanism that isn't part of that
  // precedence chain, so it survives the override.
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android") {
    println!("cargo:rustc-link-arg=-Wl,-z,max-page-size=16384");
  }

  // `get_display_name`/`get_launch_uri` (src/lib.rs) are app-level commands,
  // not plugin commands, so each needs its own ACL entry —
  // `AppManifest::commands` autogenerates `allow-<cmd>`/`deny-<cmd>`, which
  // capabilities/default.json then grants explicitly.
  tauri_build::try_build(
    tauri_build::Attributes::new().app_manifest(
      tauri_build::AppManifest::new().commands(&["get_display_name", "get_launch_uri"]),
    ),
  )
  .expect("failed to run tauri-build");
}
