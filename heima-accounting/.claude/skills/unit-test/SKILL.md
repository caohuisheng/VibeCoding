---
name: unit-test
description: 对 src-tauri 目录下的 Rust 代码进行单元测试
---

# 单元测试 — src-tauri (Rust)

此技能用于运行和管理 `src-tauri/` 目录下的 Rust 单元测试。

## 架构说明

测试架构采用**内部函数提取模式**：

- **`db.rs`**：`Database` 结构体提供 `#[cfg(test)] pub(crate) fn new_test()` 构造函数，使用内存 SQLite（`Connection::open_in_memory()`）代替文件数据库，测试不依赖文件系统和 Tauri AppHandle。
- **`commands.rs`**：每个 Tauri 命令的业务逻辑已提取到 `xxx_internal(&Database, ...)` 内部函数中，Tauri 命令仅负责加锁并委托。测试直接调用内部函数，无需启动 Tauri 运行时。

```
┌─────────────────────────────────────────────────┐
│  #[tauri::command]  →  State<DbState> 加锁      │
│                           ↓                     │
│  xxx_internal(&Database, ...)  ← 测试目标       │
│                           ↓                     │
│  Database { conn: Connection }                  │
│                           ↓                     │
│  内存 SQLite (测试)  │  文件 SQLite (生产)       │
└─────────────────────────────────────────────────┘
```

## 运行测试

### 运行全部测试

```bash
cd src-tauri && cargo test
```

### 运行特定模块测试

```bash
# 仅运行 db.rs 中的测试
cd src-tauri && cargo test db::tests

# 仅运行 commands.rs 中的测试
cd src-tauri && cargo test commands::tests
```

### 运行单个测试

```bash
cd src-tauri && cargo test <测试函数名>
```

### 显示测试输出

```bash
cd src-tauri && cargo test -- --nocapture
```

## 测试覆盖范围

### db.rs（7 个测试）

| 测试 | 覆盖内容 |
|------|---------|
| `test_create_tables` | 验证 categories 和 bills 表创建成功 |
| `test_migrate_adds_bill_type` | 模拟旧数据库迁移，验证 bill_type 列被添加 |
| `test_seed_categories_populates_data` | 验证支出种子数据插入：10 个一级分类 + 47 个二级分类 = 57 条 |
| `test_seed_categories_idempotent` | 验证种子数据重复插入是幂等的 |
| `test_seed_income_categories` | 验证收入种子数据插入：6 个一级分类 + 21 个二级分类 = 27 条 |
| `test_seed_income_categories_idempotent` | 验证收入种子数据重复插入是幂等的 |
| `test_full_init_flow` | 验证完整初始化流程，总计 84 条分类（57 支出 + 27 收入）|

### commands.rs（29 个测试）

**分类查询（4 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_get_all_categories` | 获取全部分类（84 条）|
| `test_get_expense_categories` | 按 bill_type=expense 筛选（57 条）|
| `test_get_income_categories` | 按 bill_type=income 筛选（27 条）|
| `test_categories_sort_order` | 验证分类按 sort_order 升序排列 |

**账单 CRUD（7 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_add_bill` | 新增账单返回有效 ID |
| `test_add_bill_without_note` | 新增账单（无备注）|
| `test_add_and_get_bill` | 新增后查询，验证数据完整性 |
| `test_get_bills_with_joins` | 验证 JOIN 查询：分类名称、图标、父分类信息 |
| `test_update_bill` | 更新账单（金额、分类、日期、备注）|
| `test_delete_bill` | 删除账单 |
| `test_delete_nonexistent_bill` | 删除不存在的账单不报错 |
| `test_update_nonexistent_bill` | 更新不存在的账单不报错 |

**筛选查询（6 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_filter_by_month` | 按月份筛选 |
| `test_filter_by_category` | 按二级分类和一级分类筛选 |
| `test_filter_by_keyword` | 按备注关键词模糊搜索 |
| `test_filter_by_bill_type` | 按收支类型筛选 |
| `test_filter_combined` | 同时按多条件组合筛选 |

**统计分析（4 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_monthly_stats` | 月度统计（金额合计、笔数、排序）|
| `test_monthly_stats_filtered_by_type` | 按类型筛选月度统计 |
| `test_category_stats` | 分类统计（金额、百分比）|
| `test_category_stats_zero_total` | 无数据时分类统计不崩溃 |

**月度汇总（2 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_monthly_summary` | 本月收支 + 今日收支汇总 |
| `test_monthly_summary_empty` | 空数据时汇总返回零值 |

**CSV 导出（3 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_export_csv` | 导出支出数据到 CSV 格式 |
| `test_export_csv_empty` | 无数据时导出仅含表头 |
| `test_export_csv_with_income` | 导出收入数据（类型标签为"收入"）|

**边界情况（3 个）**
| 测试 | 覆盖内容 |
|------|---------|
| `test_add_bill_with_decimal_amount` | 最小金额 0.01 元 |
| `test_add_bill_with_large_amount` | 大金额 9999999.99 元 |
| `test_add_multiple_bills_ordering` | 多条账单按日期降序排列 |

## 新增测试指南

### 何时添加测试
- 新增命令/功能时，同步添加对应的单元测试
- 发现 Bug 时，先写复现测试再修复
- 重构代码后，确保已有测试仍然通过

### 测试编写规范
1. **使用内存数据库**：通过 `Database::new_test()` 创建，不依赖文件系统和 Tauri
2. **测试内部函数**：测试 `xxx_internal()` 函数而非 `#[tauri::command]` 函数
3. **每个测试只验证一个行为**：保持测试小而聚焦
4. **命名规范**：`test_<功能>_<场景>`，如 `test_add_bill_without_note`
5. **辅助函数**：使用 `insert_test_bill()` 辅助插入测试数据

### 示例模板

```rust
#[test]
fn test_<功能描述>() {
    // 1. 准备：创建测试数据库
    let db = Database::new_test();

    // 2. 执行：调用被测试的内部函数
    let result = xxx_internal(&db, ...);

    // 3. 验证：断言结果
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), expected);
}
```

### 如何让新命令可测试

如果要在 `commands.rs` 中添加新的 Tauri 命令：

1. **先写内部函数**（可测试的核心逻辑）：
```rust
pub fn new_feature_internal(db: &Database, ...) -> Result<T, String> {
    // 核心业务逻辑
}
```

2. **再写 Tauri 命令**（薄包装层）：
```rust
#[tauri::command]
pub fn new_feature(state: State<DbState>, ...) -> Result<T, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    new_feature_internal(&db, ...)
}
```

3. **在 lib.rs 中注册**：
```rust
.invoke_handler(tauri::generate_handler![
    ...
    commands::new_feature,
])
```

4. **编写测试**验证 `new_feature_internal` 的各项行为。
