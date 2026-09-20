// Prevent an additional console window in Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    worldviewer_lib::run()
}
