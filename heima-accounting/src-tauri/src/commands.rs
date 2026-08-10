use crate::db::Database;
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

// ===== 内部核心函数（可脱离 Tauri 独立测试） =====

/// 获取分类列表
pub fn get_categories_internal(
    db: &Database,
    bill_type: Option<&str>,
) -> Result<Vec<Category>, String> {
    let mut sql = String::from(
        "SELECT id, name, parent_id, icon, sort_order, bill_type FROM categories WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(bt) = bill_type {
        sql.push_str(" AND bill_type = ?");
        params.push(Box::new(bt.to_string()));
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

/// 新增账单，返回新记录的 ID
pub fn add_bill_internal(
    db: &Database,
    amount: f64,
    category_id: i64,
    date: &str,
    note: Option<&str>,
    bill_type: &str,
) -> Result<i64, String> {
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

/// 查询账单列表
pub fn get_bills_internal(db: &Database) -> Result<Vec<BillWithCategory>, String> {
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

    let results = stmt
        .query_map([], |row| {
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

    Ok(results)
}

/// 按条件筛选账单
pub fn get_bills_filtered_internal(
    db: &Database,
    month: Option<&str>,
    category_id: Option<i64>,
    keyword: Option<&str>,
    bill_type: Option<&str>,
) -> Result<Vec<BillWithCategory>, String> {
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

    if let Some(m) = month {
        sql.push_str(" AND b.date LIKE ?");
        param_values.push(Box::new(format!("{}%", m)));
    }

    if let Some(cid) = category_id {
        sql.push_str(" AND (b.category_id = ? OR sc.parent_id = ?)");
        param_values.push(Box::new(cid));
        param_values.push(Box::new(cid));
    }

    if let Some(kw) = keyword {
        sql.push_str(" AND b.note LIKE ?");
        param_values.push(Box::new(format!("%{}%", kw)));
    }

    if let Some(bt) = bill_type {
        sql.push_str(" AND b.bill_type = ?");
        param_values.push(Box::new(bt.to_string()));
    }

    sql.push_str(" ORDER BY b.date DESC, b.id DESC");

    let mut stmt = db.conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

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
pub fn update_bill_internal(
    db: &Database,
    id: i64,
    amount: f64,
    category_id: i64,
    date: &str,
    note: Option<&str>,
    bill_type: &str,
) -> Result<(), String> {
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
pub fn delete_bill_internal(db: &Database, id: i64) -> Result<(), String> {
    db.conn
        .execute("DELETE FROM bills WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取月度统计
pub fn get_monthly_stats_internal(
    db: &Database,
    bill_type: Option<&str>,
) -> Result<Vec<MonthlyStats>, String> {
    let mut sql = String::from(
        "SELECT substr(date, 1, 7) as month, SUM(amount) as total, COUNT(*) as cnt
         FROM bills WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(bt) = bill_type {
        sql.push_str(" AND bill_type = ?");
        params.push(Box::new(bt.to_string()));
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

/// 获取分类统计
pub fn get_category_stats_internal(
    db: &Database,
    month: &str,
    bill_type: Option<&str>,
) -> Result<Vec<CategoryStats>, String> {
    let month_pattern = format!("{}%", month);

    // 计算当月总金额
    let mut grand_total_sql = String::from(
        "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1",
    );
    let mut gt_params: Vec<Box<dyn rusqlite::types::ToSql>> =
        vec![Box::new(month_pattern.clone())];

    if let Some(bt) = bill_type {
        grand_total_sql.push_str(" AND bill_type = ?2");
        gt_params.push(Box::new(bt.to_string()));
    }

    let grand_total: f64 = db
        .conn
        .query_row(
            &grand_total_sql,
            rusqlite::params_from_iter(gt_params.iter().map(|p| p.as_ref())),
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 按二级分类汇总
    let mut sql = String::from(
        "SELECT sc.id, sc.name, sc.icon, pc.name, COALESCE(SUM(b.amount), 0) as total
         FROM bills b
         JOIN categories sc ON b.category_id = sc.id
         JOIN categories pc ON sc.parent_id = pc.id
         WHERE b.date LIKE ?1",
    );

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(month_pattern)];

    if let Some(bt) = bill_type {
        sql.push_str(" AND b.bill_type = ?2");
        params.push(Box::new(bt.to_string()));
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
pub fn export_csv_internal(db: &Database) -> Result<String, String> {
    let bills = get_bills_internal(db)?;

    let mut csv = String::from("日期,类型,一级分类,二级分类,金额,备注\n");
    for b in &bills {
        let type_label = if b.bill_type == "income" {
            "收入"
        } else {
            "支出"
        };
        csv.push_str(&format!(
            "{},{},{},{},{},\"{}\"\n",
            b.date, type_label, b.parent_category_name, b.category_name, b.amount, b.note
        ));
    }

    Ok(csv)
}

/// 获取月度收支汇总
pub fn get_monthly_summary_internal(
    db: &Database,
    month: &str,
    today: &str,
) -> Result<MonthlySummary, String> {
    let month_expense: f64 = db
        .conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1 AND bill_type = 'expense'",
            params![format!("{}%", month)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let month_income: f64 = db
        .conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date LIKE ?1 AND bill_type = 'income'",
            params![format!("{}%", month)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let today_expense: f64 = db
        .conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date = ?1 AND bill_type = 'expense'",
            params![&today],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let today_income: f64 = db
        .conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM bills WHERE date = ?1 AND bill_type = 'income'",
            params![&today],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(MonthlySummary {
        month_expense,
        month_income,
        today_expense,
        today_income,
    })
}

// ===== Tauri 命令（对外接口，加锁后委托给内部函数） =====

/// 获取分类（可按收支类型筛选）
#[tauri::command]
pub fn get_categories(
    state: State<DbState>,
    bill_type: Option<String>,
) -> Result<Vec<Category>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    get_categories_internal(&db, bill_type.as_deref())
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
    add_bill_internal(&db, amount, category_id, &date, note.as_deref(), &bill_type)
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
    get_bills_filtered_internal(
        &db,
        month.as_deref(),
        category_id,
        keyword.as_deref(),
        bill_type.as_deref(),
    )
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
    update_bill_internal(&db, id, amount, category_id, &date, note.as_deref(), &bill_type)
}

/// 删除账单
#[tauri::command]
pub fn delete_bill(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    delete_bill_internal(&db, id)
}

/// 获取月度统计（可按类型筛选）
#[tauri::command]
pub fn get_monthly_stats(
    state: State<DbState>,
    bill_type: Option<String>,
) -> Result<Vec<MonthlyStats>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    get_monthly_stats_internal(&db, bill_type.as_deref())
}

/// 获取分类统计（指定月份，可按类型筛选）
#[tauri::command]
pub fn get_category_stats(
    state: State<DbState>,
    month: String,
    bill_type: Option<String>,
) -> Result<Vec<CategoryStats>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    get_category_stats_internal(&db, &month, bill_type.as_deref())
}

/// 导出 CSV
#[tauri::command]
pub fn export_csv(state: State<DbState>) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    export_csv_internal(&db)
}

/// 获取月度收支汇总
#[tauri::command]
pub fn get_monthly_summary(
    state: State<DbState>,
    month: String,
    today: String,
) -> Result<MonthlySummary, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    get_monthly_summary_internal(&db, &month, &today)
}

// ===== 测试模块 =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    /// 创建测试用数据库（使用内存 SQLite，不依赖文件系统和 Tauri）
    fn new_test_db() -> Database {
        Database::new_test()
    }

    /// 在测试数据库中插入一条账单并返回 ID
    fn insert_test_bill(
        db: &Database,
        amount: f64,
        category_id: i64,
        date: &str,
        note: &str,
        bill_type: &str,
    ) -> i64 {
        add_bill_internal(db, amount, category_id, date, Some(note), bill_type)
            .expect("插入测试账单失败")
    }

    // ===== 分类相关测试 =====

    #[test]
    fn test_get_all_categories() {
        let db = new_test_db();
        let categories = get_categories_internal(&db, None).expect("获取分类失败");
        // 支出 57 + 收入 27 = 84
        assert_eq!(categories.len(), 84);
    }

    #[test]
    fn test_get_expense_categories() {
        let db = new_test_db();
        let categories = get_categories_internal(&db, Some("expense")).expect("获取支出分类失败");
        assert_eq!(categories.len(), 57);
        for c in &categories {
            assert_eq!(c.bill_type, "expense");
        }
    }

    #[test]
    fn test_get_income_categories() {
        let db = new_test_db();
        let categories = get_categories_internal(&db, Some("income")).expect("获取收入分类失败");
        assert_eq!(categories.len(), 27);
        for c in &categories {
            assert_eq!(c.bill_type, "income");
        }
    }

    #[test]
    fn test_categories_sort_order() {
        let db = new_test_db();
        let categories = get_categories_internal(&db, Some("expense")).expect("获取分类失败");
        // 验证按 sort_order 升序排列
        for i in 1..categories.len() {
            assert!(
                categories[i].sort_order >= categories[i - 1].sort_order,
                "分类应按 sort_order 升序排列"
            );
        }
    }

    // ===== 账单 CRUD 测试 =====

    #[test]
    fn test_add_bill() {
        let db = new_test_db();
        let id = add_bill_internal(&db, 35.5, 101, "2026-08-10", Some("午餐"), "expense")
            .expect("新增账单失败");
        assert!(id > 0, "新增账单应返回有效 ID");
    }

    #[test]
    fn test_add_bill_without_note() {
        let db = new_test_db();
        let id = add_bill_internal(&db, 100.0, 101, "2026-08-10", None, "expense")
            .expect("新增账单失败");
        assert!(id > 0);
    }

    #[test]
    fn test_add_and_get_bill() {
        let db = new_test_db();
        add_bill_internal(&db, 25.0, 102, "2026-08-09", Some("午餐"), "expense")
            .expect("新增失败");

        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].amount, 25.0);
        assert_eq!(bills[0].category_id, 102);
        assert_eq!(bills[0].date, "2026-08-09");
        assert_eq!(bills[0].note, "午餐");
        assert_eq!(bills[0].bill_type, "expense");
    }

    #[test]
    fn test_get_bills_with_joins() {
        let db = new_test_db();
        // 插入到 category 101（早餐，父级为 1：餐饮饮食）
        add_bill_internal(&db, 15.0, 101, "2026-08-10", Some("早餐"), "expense")
            .expect("新增失败");

        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills.len(), 1);
        // 验证 JOIN 后能拿到分类信息
        assert_eq!(bills[0].category_name, "早餐");
        assert_eq!(bills[0].category_icon, "🌅");
        assert_eq!(bills[0].parent_category_id, 1);
        assert_eq!(bills[0].parent_category_name, "餐饮饮食");
        assert_eq!(bills[0].parent_category_icon, "🍽️");
    }

    #[test]
    fn test_update_bill() {
        let db = new_test_db();
        let id = insert_test_bill(&db, 50.0, 102, "2026-08-08", "旧备注", "expense");

        update_bill_internal(&db, id, 80.0, 103, "2026-08-09", Some("新备注"), "expense")
            .expect("更新失败");

        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].amount, 80.0);
        assert_eq!(bills[0].category_id, 103);
        assert_eq!(bills[0].date, "2026-08-09");
        assert_eq!(bills[0].note, "新备注");
    }

    #[test]
    fn test_delete_bill() {
        let db = new_test_db();
        let id = insert_test_bill(&db, 50.0, 102, "2026-08-08", "测试", "expense");

        delete_bill_internal(&db, id).expect("删除失败");

        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills.len(), 0, "删除后应无数据");
    }

    #[test]
    fn test_delete_nonexistent_bill() {
        let db = new_test_db();
        // 删除不存在的记录不应报错
        let result = delete_bill_internal(&db, 9999);
        assert!(result.is_ok(), "删除不存在的记录不应报错");
    }

    // ===== 筛选查询测试 =====

    #[test]
    fn test_filter_by_month() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-07-15", "七月", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-01", "八月", "expense");
        insert_test_bill(&db, 30.0, 103, "2026-08-20", "八月二", "expense");

        let bills =
            get_bills_filtered_internal(&db, Some("2026-08"), None, None, None).expect("筛选失败");
        assert_eq!(bills.len(), 2);
        for b in &bills {
            assert!(b.date.starts_with("2026-08"));
        }
    }

    #[test]
    fn test_filter_by_category() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-08-01", "早餐", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-02", "午餐", "expense");
        insert_test_bill(&db, 30.0, 201, "2026-08-03", "地铁", "expense");

        // 按二级分类筛选
        let bills =
            get_bills_filtered_internal(&db, None, Some(101), None, None).expect("筛选失败");
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].category_id, 101);

        // 按一级分类筛选（parent_id = 1 即餐饮饮食）
        let bills =
            get_bills_filtered_internal(&db, None, Some(1), None, None).expect("筛选失败");
        assert_eq!(bills.len(), 2); // 101 和 102 都属于餐饮饮食
    }

    #[test]
    fn test_filter_by_keyword() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-08-01", "麦当劳早餐", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-02", "肯德基午餐", "expense");
        insert_test_bill(&db, 30.0, 201, "2026-08-03", "地铁通勤", "expense");

        let bills =
            get_bills_filtered_internal(&db, None, None, Some("麦当劳"), None).expect("筛选失败");
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].note, "麦当劳早餐");
    }

    #[test]
    fn test_filter_by_bill_type() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-08-01", "支出", "expense");
        insert_test_bill(&db, 5000.0, 1101, "2026-08-01", "工资", "income");

        let expense_bills =
            get_bills_filtered_internal(&db, None, None, None, Some("expense")).expect("筛选失败");
        assert_eq!(expense_bills.len(), 1);
        assert_eq!(expense_bills[0].bill_type, "expense");

        let income_bills =
            get_bills_filtered_internal(&db, None, None, None, Some("income")).expect("筛选失败");
        assert_eq!(income_bills.len(), 1);
        assert_eq!(income_bills[0].bill_type, "income");
    }

    #[test]
    fn test_filter_combined() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-08-01", "早餐", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-15", "午餐", "expense");
        insert_test_bill(&db, 30.0, 101, "2026-07-01", "早餐", "expense");

        // 同时按月份和分类筛选
        let bills = get_bills_filtered_internal(
            &db,
            Some("2026-08"),
            Some(101),
            None,
            Some("expense"),
        )
        .expect("筛选失败");
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].date, "2026-08-01");
        assert_eq!(bills[0].category_id, 101);
    }

    // ===== 统计测试 =====

    #[test]
    fn test_monthly_stats() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-07-15", "", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-01", "", "expense");
        insert_test_bill(&db, 30.0, 103, "2026-08-20", "", "expense");

        let stats = get_monthly_stats_internal(&db, None).expect("统计失败");
        assert!(stats.len() >= 2);

        // 统计应按月份降序排列
        let aug = stats.iter().find(|s| s.month == "2026-08").expect("应有8月数据");
        assert_eq!(aug.total, 50.0);
        assert_eq!(aug.count, 2);

        let jul = stats.iter().find(|s| s.month == "2026-07").expect("应有7月数据");
        assert_eq!(jul.total, 10.0);
        assert_eq!(jul.count, 1);
    }

    #[test]
    fn test_monthly_stats_filtered_by_type() {
        let db = new_test_db();
        insert_test_bill(&db, 100.0, 101, "2026-08-01", "", "expense");
        insert_test_bill(&db, 5000.0, 1101, "2026-08-01", "工资", "income");

        let expense_stats =
            get_monthly_stats_internal(&db, Some("expense")).expect("统计失败");
        let aug = expense_stats.iter().find(|s| s.month == "2026-08").unwrap();
        assert_eq!(aug.total, 100.0);

        let income_stats =
            get_monthly_stats_internal(&db, Some("income")).expect("统计失败");
        let aug = income_stats.iter().find(|s| s.month == "2026-08").unwrap();
        assert_eq!(aug.total, 5000.0);
    }

    #[test]
    fn test_category_stats() {
        let db = new_test_db();
        insert_test_bill(&db, 40.0, 101, "2026-08-01", "早餐", "expense");
        insert_test_bill(&db, 60.0, 102, "2026-08-02", "午餐", "expense");

        let stats =
            get_category_stats_internal(&db, "2026-08", None).expect("分类统计失败");

        let total: f64 = stats.iter().map(|s| s.total).sum();
        assert_eq!(total, 100.0);

        // 早餐占比 40%
        let breakfast = stats.iter().find(|s| s.category_id == 101).unwrap();
        assert_eq!(breakfast.total, 40.0);
        assert!((breakfast.percentage - 40.0).abs() < 0.01);

        // 午餐占比 60%
        let lunch = stats.iter().find(|s| s.category_id == 102).unwrap();
        assert_eq!(lunch.total, 60.0);
        assert!((lunch.percentage - 60.0).abs() < 0.01);
    }

    #[test]
    fn test_category_stats_zero_total() {
        let db = new_test_db();
        // 没有数据时不应崩溃
        let stats =
            get_category_stats_internal(&db, "2026-08", None).expect("空统计不应失败");
        // 没有数据时返回空列表
        assert!(stats.is_empty() || stats.iter().all(|s| s.total == 0.0));
    }

    // ===== 月度汇总测试 =====

    #[test]
    fn test_monthly_summary() {
        let db = new_test_db();
        // 本月支出
        insert_test_bill(&db, 50.0, 101, "2026-08-05", "早餐", "expense");
        insert_test_bill(&db, 30.0, 102, "2026-08-06", "午餐", "expense");
        // 今天支出
        insert_test_bill(&db, 20.0, 103, "2026-08-10", "晚餐", "expense");
        // 本月收入
        insert_test_bill(&db, 5000.0, 1101, "2026-08-01", "工资", "income");
        // 今天收入
        insert_test_bill(&db, 200.0, 1301, "2026-08-10", "红包", "income");
        // 其他月份（不在统计范围）
        insert_test_bill(&db, 100.0, 101, "2026-07-01", "旧账单", "expense");

        let summary = get_monthly_summary_internal(&db, "2026-08", "2026-08-10")
            .expect("汇总失败");

        assert_eq!(summary.month_expense, 100.0); // 50+30+20
        assert_eq!(summary.month_income, 5200.0); // 5000+200
        assert_eq!(summary.today_expense, 20.0); // 只有今天的晚餐
        assert_eq!(summary.today_income, 200.0); // 今天的红包
    }

    #[test]
    fn test_monthly_summary_empty() {
        let db = new_test_db();
        let summary = get_monthly_summary_internal(&db, "2026-08", "2026-08-10")
            .expect("空汇总不应失败");

        assert_eq!(summary.month_expense, 0.0);
        assert_eq!(summary.month_income, 0.0);
        assert_eq!(summary.today_expense, 0.0);
        assert_eq!(summary.today_income, 0.0);
    }

    // ===== CSV 导出测试 =====

    #[test]
    fn test_export_csv() {
        let db = new_test_db();
        insert_test_bill(&db, 35.5, 101, "2026-08-10", "早餐", "expense");

        let csv = export_csv_internal(&db).expect("导出失败");

        // 验证 CSV 头部
        assert!(csv.starts_with("日期,类型,一级分类,二级分类,金额,备注"));
        // 验证数据行
        assert!(csv.contains("2026-08-10"));
        assert!(csv.contains("支出"));
        assert!(csv.contains("餐饮饮食"));
        assert!(csv.contains("早餐"));
        assert!(csv.contains("35.5"));
        assert!(csv.contains("早餐")); // 备注
    }

    #[test]
    fn test_export_csv_empty() {
        let db = new_test_db();
        let csv = export_csv_internal(&db).expect("导出失败");
        // 只有表头
        assert_eq!(csv.trim(), "日期,类型,一级分类,二级分类,金额,备注");
    }

    #[test]
    fn test_export_csv_with_income() {
        let db = new_test_db();
        insert_test_bill(&db, 5000.0, 1101, "2026-08-01", "工资", "income");

        let csv = export_csv_internal(&db).expect("导出失败");
        assert!(csv.contains("收入"));
        assert!(csv.contains("工资收入"));
    }

    // ===== 边界情况测试 =====

    #[test]
    fn test_add_bill_with_decimal_amount() {
        let db = new_test_db();
        let _id = add_bill_internal(&db, 0.01, 101, "2026-08-10", None, "expense")
            .expect("新增失败");
        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills[0].amount, 0.01);
    }

    #[test]
    fn test_add_bill_with_large_amount() {
        let db = new_test_db();
        let _id =
            add_bill_internal(&db, 9999999.99, 101, "2026-08-10", None, "expense")
                .expect("新增失败");
        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills[0].amount, 9999999.99);
    }

    #[test]
    fn test_add_multiple_bills_ordering() {
        let db = new_test_db();
        insert_test_bill(&db, 10.0, 101, "2026-08-01", "最早", "expense");
        insert_test_bill(&db, 20.0, 102, "2026-08-03", "中间", "expense");
        insert_test_bill(&db, 30.0, 103, "2026-08-05", "最晚", "expense");

        let bills = get_bills_internal(&db).expect("查询失败");
        assert_eq!(bills.len(), 3);
        // 应按日期降序排列
        assert_eq!(bills[0].date, "2026-08-05");
        assert_eq!(bills[1].date, "2026-08-03");
        assert_eq!(bills[2].date, "2026-08-01");
    }

    #[test]
    fn test_update_nonexistent_bill() {
        let db = new_test_db();
        // 更新不存在的记录不应报错（SQLite UPDATE 不存在的行成功但影响 0 行）
        let result = update_bill_internal(&db, 9999, 100.0, 101, "2026-08-10", None, "expense");
        assert!(result.is_ok(), "更新不存在的记录不应报错");
    }
}