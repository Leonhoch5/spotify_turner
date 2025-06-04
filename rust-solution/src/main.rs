fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Example command callable from JS
#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello from Rust, {name}!")
}