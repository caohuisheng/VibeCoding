use crate::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

// ===== 数据结构定义 =====

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub icon: String,
    pub sort_order: i64,
    pub bill_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Bill {
    pub id: Option<i64>,
    pub amount: f64,
    pub category_id: i64,
    pub date: String,
    pub note: Option<String>,
    pub bill_type: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BillWithCategory {
    pub id: i64,
    pub amount: f64,
    pub category_id: i64,
    pub date: String,
    pub note: String,
    pub bill_type: String,
    pub created_at: String,
    pub category_name: String,
    pub category_icon: String,
    pub parent_category_id: i64,
    pub parent_category_name: String,
    pub parent_category_icon: String,
}

#[derive(Debug, Serialize)]
pub struct MonthlyStats {
    pub month: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct CategoryStats {
    pub category_id: i64,
    pub category_name: String,
    pub category_icon: String,
    pub parent_category_name: String,
    pub total: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct MonthlySummary {
    pub month_expense: f64,
    pub month_income: f64,
    pub today_expense: f64,
    pub today_income: f64,
}

// ===== Tauri 命令 =====

/// 获取分类（可按收支类型筛选）
#[tauri::command]
pub fn get_categories(
    state: State<DbState>,
    bill_type: Option<String>,
) -> Result<Vec<Category>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT id, name, parent_id, icon, sort_order, bill_type FROM categories WHERE 1=1"
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref bt) = bill_type {
        sql.push_str(" AND bill_type = ?");
        params.push(Box::new(bt.clone()));
    }
    sql.push_str(" ORDER BY sort_order");

    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let categories = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                bill_type: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

/// 新增账单
#[tauri::command]
pub fn add_bill(
    state: State<DbState>,
    amount: f64,
    category_id: i64,
    date: String,
    note: Option<String>,
    bill_type: String,
) -> Result<i64, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let note = note.unwrap_or_default();

    db.conn
        .execute(
            "INSERT INTO bills (amount, category_id, date, note, bill_type) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![amount, category_id, date, note, bill_type],
        )
        .map_err(|e| e.to_string())?;

    let id = db.conn.last_insert_rowid();
    Ok(id)
}

/// 查询账单列表（支持按月份、分类、类型筛选）
#[tauri::command]
pub fn get_bills(
    state: State<DbState>,
    month: Option<String>,
    category_id: Option<i64>,
    keyword: Option<String>,
    bill_type: Option<String>,
) -> Result<Vec<BillWithCategory>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT b.id, b.amount, b.category_id, b.date, b.note, b.created_at, b.bill_type,
                sc.name, sc.icon,
                pc.id, pc.name, pc.icon
         FROM bills b
         JOIN categories sc ON b.category_id = sc.id
         JOIN categories pc ON sc.parent_id = pc.id
         WHERE 1=1",
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref m) = month {
        sql.push_str(" AND b.date LIKE ?");
        param_values.push(Box::new(format!("{}%", m)));
    }

    if let Some(cid) = category_id {
        sql.push_str(" AND (b.category_id = ? OR sc.parent_id = ?)");
        param_values.push(Box::new(cid));
        param_values.push(Box::new(cid));
    }

    if let Some(ref kw) = keyword {
        sql.push_str(" AND b.note LIKE ?");
        param_values.push(Box::new(format!("%{}%", kw)));
    }

    if let Some(ref bt) = bill_type {
        sql.push_str(" AND b.bill_type = ?");
        param_values.push(Box::new(bt.clone()));
    }

    sql.push_str(" ORDER BY b.date DESC, b.id DESC");

    // 动态构建参数
    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let bills = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(BillWithCategory {
                id: row.get(0)?,
                amount: row.get(1)?,
                category_id: row.get(2)?,
                date: row.get(3)?,
                note: row.get(4)?,
                created_at: row.get(5)?,
                bill_type: row.get(6)?,
                category_name: row.get(7)?,
                category_icon: row.get(8)?,
                parent_category_id: row.get(9)?,
                parent_category_name: row.get(10)?,
                parent_category_icon: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(bills)
}

/// 更新账单
#[tauri::command]
pub fn update_bill(
    state: State<DbState>,
    id: i64,
    amount: f64,
    category_id: i64,
    date: String,
    note: Option<String>,
    bill_type: String,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let note = note.unwrap_or_default();

    db.conn
        .execute(
            "UPDATE bills SET amount = ?1, category_id = ?2, date = ?3, note = ?4, bill_type = ?5 WHERE id = ?6",
            params![amount, category_id, date, note, bill_type, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 删除账单
#[tauri::command]
pub fn delete_bill(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.conn
        .execute("DELETE FROM bills WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取月度统计（可按类型筛选）
#[tauri::command]
pub fn get_monthly_stats(
    state: State<DbState>,
    bill_type: Option<String>,
) -> Result<Vec<MonthlyStats>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT substr(date, 1, 7) as month, SUM(amount) as total, COUNT(*) as cnt
         FROM bills WHERE 1=1"
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref bt) = bill_type {
        sql.push_str(" AND bill_type = ?");
        params.push(Box::new(bt.clone()));
    }
    sql.push_str(" GROUP BY month ORDER BY month DESC");

    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let stats = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(MonthlyStats {
                month: row.get(0)?,
                total: row.get(1)?,
                count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(stats)
}

/// 获取分类统计（指定月份，可按类型筛选）
#[tauri::command]
pub fn get_category_stats(
    state: State<DbState>,
    month: String,
    bill_type: Option<String>,
) -> Result<Vec<CategoryStats>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let month_pattern = format!("{}%", month);

    // 计算当月总金额
    let mut grand_total_sql = String::from(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1"
    );
    let mut gt_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(month_pattern.clone())];

    if let Some(ref bt) = bill_type {
        grand_total_sql.push_str(" AND bill_type = ?2");
        gt_params.push(Box::new(bt.clone()));
    }

    let grand_total: f64 = db
        .conn
        .query_row(&grand_total_sql, rusqlite::params_from_iter(gt_params.iter().map(|p| p.as_ref())), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // 按二级分类汇总
    let mut sql = String::from(
        "SELECT sc.id, sc.name, sc.icon, pc.name, COALESCE(SUM(b.amount), 0) as total
         FROM bills b
         JOIN categories sc ON b.category_id = sc.id
         JOIN categories pc ON sc.parent_id = pc.id
         WHERE b.date LIKE ?1"
    );

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(month_pattern)];

    if let Some(ref bt) = bill_type {
        sql.push_str(" AND b.bill_type = ?2");
        params.push(Box::new(bt.clone()));
    }
    sql.push_str(" GROUP BY sc.id ORDER BY total DESC");

    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let stats = stmt
        .query_map(param_refs.as_slice(), |row| {
            let total: f64 = row.get(4)?;
            Ok(CategoryStats {
                category_id: row.get(0)?,
                category_name: row.get(1)?,
                category_icon: row.get(2)?,
                parent_category_name: row.get(3)?,
                total,
                percentage: if grand_total > 0.0 {
                    (total / grand_total) * 100.0
                } else {
                    0.0
                },
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(stats)
}

/// 导出 CSV
#[tauri::command]
pub fn export_csv(state: State<DbState>) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let bills = get_bills_internal(&db)?;

    let mut csv = String::from("日期,类型,一级分类,二级分类,金额,备注\n");
    for b in &bills {
        let type_label = if b.bill_type == "income" { "收入" } else { "支出" };
        csv.push_str(&format!(
            "{},{},{},{},{},\"{}\"\n",
            b.date, type_label, b.parent_category_name, b.category_name, b.amount, b.note
        ));
    }

    Ok(csv)
}

/// 获取月度收支汇总（本月支出/收入 + 今日支出/收入）
#[tauri::command]
pub fn get_monthly_summary(
    state: State<DbState>,
    month: String,
    today: String,
) -> Result<MonthlySummary, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let month_expense: f64 = db.conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1 AND bill_type = 'expense'",
        params![format!("{}%", month)],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let month_income: f64 = db.conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1 AND bill_type = 'income'",
        params![format!("{}%", month)],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let today_expense: f64 = db.conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date = ?1 AND bill_type = 'expense'",
        params![&today],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let today_income: f64 = db.conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date = ?1 AND bill_type = 'income'",
        params![&today],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(MonthlySummary {
        month_expense,
        month_income,
        today_expense,
        today_income,
    })
}

/// 内部查询（用于导出，不通过 Tauri 命令接口）
fn get_bills_internal(db: &std::sync::MutexGuard<crate::db::Database>) -> Result<Vec<BillWithCategory>, String> {
    let mut stmt = db
        .conn
        .prepare(
            "SELECT b.id, b.amount, b.category_id, b.date, b.note, b.created_at, b.bill_type,
                    sc.name, sc.icon,
                    pc.id, pc.name, pc.icon
             FROM bills b
             JOIN categories sc ON b.category_id = sc.id
             JOIN categories pc ON sc.parent_id = pc.id
             ORDER BY b.date DESC",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt.query_map([], |row| {
        Ok(BillWithCategory {
            id: row.get(0)?,
            amount: row.get(1)?,
            category_id: row.get(2)?,
            date: row.get(3)?,
            note: row.get(4)?,
            created_at: row.get(5)?,
            bill_type: row.get(6)?,
            category_name: row.get(7)?,
            category_icon: row.get(8)?,
            parent_category_id: row.get(9)?,
            parent_category_name: row.get(10)?,
            parent_category_icon: row.get(11)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string());

    results
}
