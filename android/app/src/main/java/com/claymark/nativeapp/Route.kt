package com.claymark.nativeapp

/**
 * The app's only navigation state. Four static leaf screens off one drawer
 * don't earn a `NavHost` — this is a plain enum switch, the same style
 * `SessionMode` already uses for the reader/editor state machine.
 */
enum class Route { READER, SETTINGS, HELP, ABOUT, PRIVACY }
