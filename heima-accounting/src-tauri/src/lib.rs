mod commands;
mod db;

use std::sync::Mutex;
use tauri::Manager;
use db::Database;

/// 全局数据库状态，用 Mutex 包装以支持多线程访问
pub struct DbState(pub Mutex<Database>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 初始化数据库
            let db = Database::new(app.handle())?;
            let state = DbState(Mutex::new(db));
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_categories,
            commands::add_bill,
            commands::get_bills,
            commands::update_bill,
            commands::delete_bill,
            commands::get_monthly_stats,
            commands::get_category_stats,
            commands::export_csv,
            commands::get_monthly_summary,
        ])
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
