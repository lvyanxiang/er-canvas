mod commands;
mod errors;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::test_connection])
        .run(tauri::generate_context!())
        .expect("failed to run ER Canvas");
}
