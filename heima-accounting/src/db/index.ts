/**
 * 数据库操作封装层
 *
 * 在 Tauri 环境下调用 Rust 后端命令。
 * 在浏览器开发模式下使用 Mock 数据。
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Bill,
  BillType,
  BillFilter,
  BillWithCategory,
  Category,
  CategoryStats,
  MonthlyStats,
  MonthlySummary,
} from '../types';

// ===== 判断是否在 Tauri 环境 =====
const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// ===== 分类 =====
export async function getCategories(billType?: BillType): Promise<Category[]> {
  if (isTauriEnv()) {
    return invoke<Category[]>('get_categories', { billType: billType || null });
  }
  if (billType) {
    return MOCK_CATEGORIES.filter((c) => c.bill_type === billType);
  }
  return MOCK_CATEGORIES;
}

// ===== 账单 CRUD =====
export async function addBill(
  amount: number,
  categoryId: number,
  date: string,
  note: string,
  billType: BillType
): Promise<number> {
  if (isTauriEnv()) {
    return invoke<number>('add_bill', {
      amount,
      categoryId,
      date,
      note: note || null,
      billType,
    });
  }
  // Mock fallback
  const id = ++mockBillId;
  mockBills.push({
    id,
    amount,
    category_id: categoryId,
    date,
    note,
    bill_type: billType,
    created_at: new Date().toISOString(),
  });
  return id;
}

export async function getBills(
  filter?: BillFilter
): Promise<BillWithCategory[]> {
  if (isTauriEnv()) {
    return invoke<BillWithCategory[]>('get_bills', {
      month: filter?.month || null,
      categoryId: filter?.category_id || null,
      keyword: filter?.keyword || null,
      billType: filter?.bill_type || null,
    });
  }
  // Mock fallback
  let result = mockBills
    .map((bill) => {
      const subCat = MOCK_CATEGORIES.find((c) => c.id === bill.category_id);
      if (!subCat) return null;
      const parentCat = MOCK_CATEGORIES.find(
        (c) => c.id === subCat.parent_id
      );
      return {
        ...bill,
        bill_type: bill.bill_type || 'expense',
        category_name: subCat.name,
        category_icon: subCat.icon,
        parent_category_id: parentCat?.id ?? 0,
        parent_category_name: parentCat?.name ?? '',
        parent_category_icon: parentCat?.icon ?? '',
      } as BillWithCategory;
    })
    .filter((b): b is BillWithCategory => b !== null);

  // 筛选
  if (filter?.month) {
    result = result.filter((b) => b.date.startsWith(filter.month!));
  }
  if (filter?.category_id) {
    result = result.filter(
      (b) =>
        b.category_id === filter.category_id ||
        b.parent_category_id === filter.category_id
    );
  }
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase();
    result = result.filter((b) => b.note.toLowerCase().includes(kw));
  }
  if (filter?.bill_type) {
    result = result.filter((b) => b.bill_type === filter.bill_type);
  }

  return result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function updateBill(bill: Bill): Promise<void> {
  if (isTauriEnv()) {
    return invoke('update_bill', {
      id: bill.id,
      amount: bill.amount,
      categoryId: bill.category_id,
      date: bill.date,
      note: bill.note || null,
      billType: bill.bill_type,
    });
  }
  // Mock fallback
  const idx = mockBills.findIndex((b) => b.id === bill.id);
  if (idx !== -1) {
    mockBills[idx] = { ...bill };
  }
}

export async function deleteBill(id: number): Promise<void> {
  if (isTauriEnv()) {
    return invoke('delete_bill', { id });
  }
  // Mock fallback
  mockBills = mockBills.filter((b) => b.id !== id);
}

// ===== 统计 =====
export async function getMonthlyStats(
  billType?: BillType
): Promise<MonthlyStats[]> {
  if (isTauriEnv()) {
    return invoke<MonthlyStats[]>('get_monthly_stats', { billType: billType || null });
  }
  // Mock fallback
  const map = new Map<string, { total: number; count: number }>();
  mockBills.forEach((b) => {
    if (billType && b.bill_type !== billType) return;
    const month = b.date.substring(0, 7);
    const entry = map.get(month) || { total: 0, count: 0 };
    entry.total += b.amount;
    entry.count += 1;
    map.set(month, entry);
  });
  return Array.from(map.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));
}

export async function getCategoryStats(
  month: string,
  billType?: BillType
): Promise<CategoryStats[]> {
  if (isTauriEnv()) {
    return invoke<CategoryStats[]>('get_category_stats', {
      month,
      billType: billType || null,
    });
  }
  // Mock fallback
  const catMap = new Map<
    number,
    { name: string; icon: string; parentName: string; total: number }
  >();
  const filtered = mockBills.filter(
    (b) => b.date.startsWith(month) && (!billType || b.bill_type === billType)
  );
  const grandTotal = filtered.reduce((sum, b) => sum + b.amount, 0);

  filtered.forEach((b) => {
    const subCat = MOCK_CATEGORIES.find((c) => c.id === b.category_id);
    if (!subCat) return;
    const parentCat = MOCK_CATEGORIES.find(
      (c) => c.id === subCat.parent_id
    );
    const entry = catMap.get(subCat.id) || {
      name: subCat.name,
      icon: subCat.icon,
      parentName: parentCat?.name ?? '',
      total: 0,
    };
    entry.total += b.amount;
    catMap.set(subCat.id, entry);
  });

  return Array.from(catMap.entries()).map(([id, data]) => ({
    category_id: id,
    category_name: data.name,
    category_icon: data.icon,
    parent_category_name: data.parentName,
    total: data.total,
    percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
  }));
}

export async function getMonthlySummary(
  month: string,
  today: string
): Promise<MonthlySummary> {
  if (isTauriEnv()) {
    return invoke<MonthlySummary>('get_monthly_summary', { month, today });
  }
  // Mock fallback
  const monthExpense = mockBills
    .filter((b) => b.date.startsWith(month) && b.bill_type === 'expense')
    .reduce((sum, b) => sum + b.amount, 0);
  const monthIncome = mockBills
    .filter((b) => b.date.startsWith(month) && b.bill_type === 'income')
    .reduce((sum, b) => sum + b.amount, 0);
  const todayExpense = mockBills
    .filter((b) => b.date === today && b.bill_type === 'expense')
    .reduce((sum, b) => sum + b.amount, 0);
  const todayIncome = mockBills
    .filter((b) => b.date === today && b.bill_type === 'income')
    .reduce((sum, b) => sum + b.amount, 0);
  return { month_expense: monthExpense, month_income: monthIncome, today_expense: todayExpense, today_income: todayIncome };
}

// ===== 导出 =====
export async function exportCsv(): Promise<string> {
  if (isTauriEnv()) {
    return invoke<string>('export_csv');
  }
  // Mock fallback
  const bills = await getBills();
  const header = '日期,类型,一级分类,二级分类,金额,备注';
  const rows = bills.map((b) =>
    [
      b.date,
      b.bill_type === 'income' ? '收入' : '支出',
      b.parent_category_name,
      b.category_name,
      b.amount.toFixed(2),
      `"${b.note || ''}"`,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

// ===== Mock 数据 =====
let mockBills: Bill[] = [];
let mockBillId = 0;

// 辅助函数：创建分类对象
const mkCat = (
  id: number, name: string, parent_id: number | null,
  icon: string, sort_order: number, bill_type: string
): Category => ({ id, name, parent_id, icon, sort_order, bill_type: bill_type as BillType });

const MOCK_CATEGORIES: Category[] = [
  // === 支出一级 ===
  mkCat(1, '餐饮饮食', null, '🍽️', 1, 'expense'),
  mkCat(2, '交通出行', null, '🚗', 2, 'expense'),
  mkCat(3, '购物消费', null, '🛒', 3, 'expense'),
  mkCat(4, '住房居住', null, '🏠', 4, 'expense'),
  mkCat(5, '娱乐休闲', null, '🎮', 5, 'expense'),
  mkCat(6, '医疗健康', null, '💊', 6, 'expense'),
  mkCat(7, '教育学习', null, '📚', 7, 'expense'),
  mkCat(8, '人情往来', null, '🎁', 8, 'expense'),
  mkCat(9, '金融保险', null, '💰', 9, 'expense'),
  mkCat(10, '其他支出', null, '📦', 10, 'expense'),
  // 二级 - 餐饮饮食
  mkCat(101, '早餐', 1, '🌅', 1, 'expense'),
  mkCat(102, '午餐', 1, '☀️', 2, 'expense'),
  mkCat(103, '晚餐', 1, '🌙', 3, 'expense'),
  mkCat(104, '零食饮料', 1, '🍿', 4, 'expense'),
  mkCat(105, '外卖', 1, '📱', 5, 'expense'),
  mkCat(106, '聚餐聚会', 1, '🥂', 6, 'expense'),
  // 二级 - 交通出行
  mkCat(201, '公交地铁', 2, '🚌', 1, 'expense'),
  mkCat(202, '出租车', 2, '🚕', 2, 'expense'),
  mkCat(203, '网约车', 2, '📲', 3, 'expense'),
  mkCat(204, '加油充电', 2, '⛽', 4, 'expense'),
  mkCat(205, '停车费', 2, '🅿️', 5, 'expense'),
  mkCat(206, '火车飞机', 2, '🚄', 6, 'expense'),
  // 二级 - 购物消费
  mkCat(301, '服饰鞋包', 3, '👗', 1, 'expense'),
  mkCat(302, '数码产品', 3, '💻', 2, 'expense'),
  mkCat(303, '家居日用', 3, '🏪', 3, 'expense'),
  mkCat(304, '美妆护肤', 3, '💄', 4, 'expense'),
  mkCat(305, '超市购物', 3, '🛍️', 5, 'expense'),
  // 二级 - 住房居住
  mkCat(401, '房租', 4, '🏘️', 1, 'expense'),
  mkCat(402, '房贷', 4, '🏦', 2, 'expense'),
  mkCat(403, '水电燃气', 4, '💡', 3, 'expense'),
  mkCat(404, '物业费', 4, '🏢', 4, 'expense'),
  mkCat(405, '维修装修', 4, '🔧', 5, 'expense'),
  // 二级 - 娱乐休闲
  mkCat(501, '电影演出', 5, '🎬', 1, 'expense'),
  mkCat(502, '运动健身', 5, '🏋️', 2, 'expense'),
  mkCat(503, '游戏充值', 5, '🎮', 3, 'expense'),
  mkCat(504, '旅游度假', 5, '✈️', 4, 'expense'),
  mkCat(505, '咖啡茶馆', 5, '☕', 5, 'expense'),
  // 二级 - 医疗健康
  mkCat(601, '门诊挂号', 6, '🏥', 1, 'expense'),
  mkCat(602, '药品医疗', 6, '💊', 2, 'expense'),
  mkCat(603, '体检保健', 6, '🩺', 3, 'expense'),
  mkCat(604, '住院治疗', 6, '🚑', 4, 'expense'),
  // 二级 - 教育学习
  mkCat(701, '书籍资料', 7, '📖', 1, 'expense'),
  mkCat(702, '培训课程', 7, '🎓', 2, 'expense'),
  mkCat(703, '考试报名', 7, '📝', 3, 'expense'),
  mkCat(704, '文具用品', 7, '✏️', 4, 'expense'),
  // 二级 - 人情往来
  mkCat(801, '送礼红包', 8, '🧧', 1, 'expense'),
  mkCat(802, '请客吃饭', 8, '🍽️', 2, 'expense'),
  mkCat(803, '孝敬长辈', 8, '👴', 3, 'expense'),
  mkCat(804, '婚礼份子', 8, '💒', 4, 'expense'),
  // 二级 - 金融保险
  mkCat(901, '保险缴费', 9, '🛡️', 1, 'expense'),
  mkCat(902, '贷款利息', 9, '📊', 2, 'expense'),
  mkCat(903, '手续费', 9, '💳', 3, 'expense'),
  mkCat(904, '投资亏损', 9, '📉', 4, 'expense'),
  // 二级 - 其他支出
  mkCat(1001, '快递物流', 10, '📦', 1, 'expense'),
  mkCat(1002, '宠物支出', 10, '🐾', 2, 'expense'),
  mkCat(1003, '捐赠公益', 10, '💝', 3, 'expense'),
  mkCat(1004, '其他杂项', 10, '📌', 4, 'expense'),
  // === 收入一级 ===
  mkCat(11, '工资收入', null, '💼', 11, 'income'),
  mkCat(12, '投资收益', null, '💰', 12, 'income'),
  mkCat(13, '人情收入', null, '🎁', 13, 'income'),
  mkCat(14, '兼职副业', null, '💸', 14, 'income'),
  mkCat(15, '退款返利', null, '🔄', 15, 'income'),
  mkCat(16, '其他收入', null, '📦', 16, 'income'),
  // 二级 - 工资收入
  mkCat(1101, '基本工资', 11, '💵', 1, 'income'),
  mkCat(1102, '加班补贴', 11, '⏰', 2, 'income'),
  mkCat(1103, '年终奖金', 11, '🎊', 3, 'income'),
  mkCat(1104, '绩效奖金', 11, '📈', 4, 'income'),
  // 二级 - 投资收益
  mkCat(1201, '股票基金', 12, '📊', 1, 'income'),
  mkCat(1202, '理财产品', 12, '🏦', 2, 'income'),
  mkCat(1203, '房租收入', 12, '🏘️', 3, 'income'),
  mkCat(1204, '利息收入', 12, '💹', 4, 'income'),
  // 二级 - 人情收入
  mkCat(1301, '红包收入', 13, '🧧', 1, 'income'),
  mkCat(1302, '礼金收入', 13, '💒', 2, 'income'),
  mkCat(1303, '压岁钱', 13, '🧨', 3, 'income'),
  mkCat(1304, '其他赠予', 13, '💝', 4, 'income'),
  // 二级 - 兼职副业
  mkCat(1401, '接单收入', 14, '💻', 1, 'income'),
  mkCat(1402, '自媒体', 14, '📱', 2, 'income'),
  mkCat(1403, '咨询收入', 14, '🗣️', 3, 'income'),
  mkCat(1404, '销售佣金', 14, '🤝', 4, 'income'),
  // 二级 - 退款返利
  mkCat(1501, '购物退款', 15, '↩️', 1, 'income'),
  mkCat(1502, '返利优惠', 15, '💵', 2, 'income'),
  mkCat(1503, '报销收入', 15, '🧾', 3, 'income'),
  // 二级 - 其他收入
  mkCat(1601, '闲置出售', 16, '♻️', 1, 'income'),
  mkCat(1602, '其他杂项', 16, '📌', 2, 'income'),
];
