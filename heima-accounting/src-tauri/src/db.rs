use rusqlite::{Connection, params, Result as SqlResult};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// 数据库管理器
pub struct Database {
    pub conn: Connection,
}

impl Database {
    /// 创建数据库连接并初始化表结构 + 种子数据
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        // 数据库文件存储在 app 数据目录
        let data_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        std::fs::create_dir_all(&data_dir)?;

        let db_path = data_dir.join("heima_accounting.db");
        let conn = Connection::open(db_path)?;

        // 启用 WAL 模式提升并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Database { conn };
        db.create_tables()?;
        db.migrate()?;
        db.seed_categories()?;
        db.seed_income_categories()?;

        Ok(db)
    }

    /// 建表
    fn create_tables(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                parent_id INTEGER,
                icon TEXT NOT NULL DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                bill_type TEXT NOT NULL DEFAULT 'expense'
            );

            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                bill_type TEXT NOT NULL DEFAULT 'expense',
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );

            CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
            CREATE INDEX IF NOT EXISTS idx_bills_category ON bills(category_id);",
        )?;
        Ok(())
    }

    /// 数据库迁移：为旧数据库添加 bill_type 列
    fn migrate(&self) -> SqlResult<()> {
        // 检查并迁移 bills 表
        let mut stmt = self.conn.prepare("PRAGMA table_info(bills)")?;
        let has_bill_type = stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .filter_map(|r| r.ok())
            .any(|name| name == "bill_type");
        drop(stmt);

        if !has_bill_type {
            self.conn.execute_batch(
                "ALTER TABLE bills ADD COLUMN bill_type TEXT NOT NULL DEFAULT 'expense';"
            )?;
        }

        // 检查并迁移 categories 表
        let mut stmt = self.conn.prepare("PRAGMA table_info(categories)")?;
        let has_bill_type = stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .filter_map(|r| r.ok())
            .any(|name| name == "bill_type");
        drop(stmt);

        if !has_bill_type {
            self.conn.execute_batch(
                "ALTER TABLE categories ADD COLUMN bill_type TEXT NOT NULL DEFAULT 'expense';"
            )?;
        }

        Ok(())
    }

    /// 插入种子分类数据（仅在表为空时）
    fn seed_categories(&self) -> SqlResult<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;

        if count > 0 {
            return Ok(());
        }

        // 一级分类
        let parents = [
            (1, "餐饮饮食", "", "🍽️"),
            (2, "交通出行", "", "🚗"),
            (3, "购物消费", "", "🛒"),
            (4, "住房居住", "", "🏠"),
            (5, "娱乐休闲", "", "🎮"),
            (6, "医疗健康", "", "💊"),
            (7, "教育学习", "", "📚"),
            (8, "人情往来", "", "🎁"),
            (9, "金融保险", "", "💰"),
            (10, "其他支出", "", "📦"),
        ];

        for (id, name, _parent_id, icon) in &parents {
            self.conn.execute(
                "INSERT INTO categories (id, name, parent_id, icon, sort_order, bill_type) VALUES (?1, ?2, NULL, ?3, ?1, 'expense')",
                params![id, name, icon],
            )?;
        }

        // 二级分类
        let children = [
            (101, "早餐", 1, "🌅"), (102, "午餐", 1, "☀️"), (103, "晚餐", 1, "🌙"),
            (104, "零食饮料", 1, "🍿"), (105, "外卖", 1, "📱"), (106, "聚餐聚会", 1, "🥂"),
            (201, "公交地铁", 2, "🚌"), (202, "出租车", 2, "🚕"), (203, "网约车", 2, "📲"),
            (204, "加油充电", 2, "⛽"), (205, "停车费", 2, "🅿️"), (206, "火车飞机", 2, "🚄"),
            (301, "服饰鞋包", 3, "👗"), (302, "数码产品", 3, "💻"), (303, "家居日用", 3, "🏪"),
            (304, "美妆护肤", 3, "💄"), (305, "超市购物", 3, "🛍️"),
            (401, "房租", 4, "🏘️"), (402, "房贷", 4, "🏦"), (403, "水电燃气", 4, "💡"),
            (404, "物业费", 4, "🏢"), (405, "维修装修", 4, "🔧"),
            (501, "电影演出", 5, "🎬"), (502, "运动健身", 5, "🏋️"), (503, "游戏充值", 5, "🎮"),
            (504, "旅游度假", 5, "✈️"), (505, "咖啡茶馆", 5, "☕"),
            (601, "门诊挂号", 6, "🏥"), (602, "药品医疗", 6, "💊"), (603, "体检保健", 6, "🩺"),
            (604, "住院治疗", 6, "🚑"),
            (701, "书籍资料", 7, "📖"), (702, "培训课程", 7, "🎓"), (703, "考试报名", 7, "📝"),
            (704, "文具用品", 7, "✏️"),
            (801, "送礼红包", 8, "🧧"), (802, "请客吃饭", 8, "🍽️"), (803, "孝敬长辈", 8, "👴"),
            (804, "婚礼份子", 8, "💒"),
            (901, "保险缴费", 9, "🛡️"), (902, "贷款利息", 9, "📊"), (903, "手续费", 9, "💳"),
            (904, "投资亏损", 9, "📉"),
            (1001, "快递物流", 10, "📦"), (1002, "宠物支出", 10, "🐾"), (1003, "捐赠公益", 10, "💝"),
            (1004, "其他杂项", 10, "📌"),
        ];

        for (id, name, parent_id, icon) in &children {
            self.conn.execute(
                "INSERT INTO categories (id, name, parent_id, icon, sort_order, bill_type) VALUES (?1, ?2, ?3, ?4, ?1, 'expense')",
                params![id, name, parent_id, icon],
            )?;
        }

        Ok(())
    }

    /// 插入收入分类种子数据（仅在无收入分类时）
    fn seed_income_categories(&self) -> SqlResult<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM categories WHERE bill_type = 'income'", [], |row| row.get(0))?;

        if count > 0 {
            return Ok(());
        }

        // 一级收入分类
        let parents = [
            (11, "工资收入", "💼"),
            (12, "投资收益", "💰"),
            (13, "人情收入", "🎁"),
            (14, "兼职副业", "💸"),
            (15, "退款返利", "🔄"),
            (16, "其他收入", "📦"),
        ];

        for (id, name, icon) in &parents {
            self.conn.execute(
                "INSERT INTO categories (id, name, parent_id, icon, sort_order, bill_type) VALUES (?1, ?2, NULL, ?3, ?1, 'income')",
                params![id, name, icon],
            )?;
        }

        // 二级收入分类
        let children = [
            (1101, "基本工资", 11, "💵"), (1102, "加班补贴", 11, "⏰"),
            (1103, "年终奖金", 11, "🎊"), (1104, "绩效奖金", 11, "📈"),
            (1201, "股票基金", 12, "📊"), (1202, "理财产品", 12, "🏦"),
            (1203, "房租收入", 12, "🏘️"), (1204, "利息收入", 12, "💹"),
            (1301, "红包收入", 13, "🧧"), (1302, "礼金收入", 13, "💒"),
            (1303, "压岁钱", 13, "🧨"), (1304, "其他赠予", 13, "💝"),
            (1401, "接单收入", 14, "💻"), (1402, "自媒体", 14, "📱"),
            (1403, "咨询收入", 14, "🗣️"), (1404, "销售佣金", 14, "🤝"),
            (1501, "购物退款", 15, "↩️"), (1502, "返利优惠", 15, "💵"),
            (1503, "报销收入", 15, "🧾"),
            (1601, "闲置出售", 16, "♻️"), (1602, "其他杂项", 16, "📌"),
        ];

        for (id, name, parent_id, icon) in &children {
            self.conn.execute(
                "INSERT INTO categories (id, name, parent_id, icon, sort_order, bill_type) VALUES (?1, ?2, ?3, ?4, ?1, 'income')",
                params![id, name, parent_id, icon],
            )?;
        }

        Ok(())
    }
}
