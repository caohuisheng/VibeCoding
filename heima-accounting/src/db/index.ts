/**
 * 数据库操作封装层
 *
 * 在 Tauri 环境下调用 Rust 后端命令。
 * 在浏览器开发模式下使用 Mock 数据。
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Bill,
  BillFilter,
  BillWithCategory,
  Category,
  CategoryStats,
  MonthlyStats,
} from '../types';

// ===== 判断是否在 Tauri 环境 =====
const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// ===== 分类 =====
export async function getCategories(): Promise<Category[]> {
  if (isTauriEnv()) {
    return invoke<Category[]>('get_categories');
  }
  return MOCK_CATEGORIES;
}

// ===== 账单 CRUD =====
export async function addBill(
  amount: number,
  categoryId: number,
  date: string,
  note: string
): Promise<number> {
  if (isTauriEnv()) {
    return invoke<number>('add_bill', {
      amount,
      categoryId,
      date,
      note: note || null,
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
export async function getMonthlyStats(): Promise<MonthlyStats[]> {
  if (isTauriEnv()) {
    return invoke<MonthlyStats[]>('get_monthly_stats');
  }
  // Mock fallback
  const map = new Map<string, { total: number; count: number }>();
  mockBills.forEach((b) => {
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
  month: string
): Promise<CategoryStats[]> {
  if (isTauriEnv()) {
    return invoke<CategoryStats[]>('get_category_stats', { month });
  }
  // Mock fallback
  const catMap = new Map<
    number,
    { name: string; icon: string; parentName: string; total: number }
  >();
  const grandTotal = mockBills
    .filter((b) => b.date.startsWith(month))
    .reduce((sum, b) => sum + b.amount, 0);

  mockBills
    .filter((b) => b.date.startsWith(month))
    .forEach((b) => {
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

// ===== 导出 =====
export async function exportCsv(): Promise<string> {
  if (isTauriEnv()) {
    return invoke<string>('export_csv');
  }
  // Mock fallback
  const bills = await getBills();
  const header = '日期,一级分类,二级分类,金额,备注';
  const rows = bills.map((b) =>
    [
      b.date,
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

const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: '餐饮饮食', parent_id: null, icon: '🍽️', sort_order: 1 },
  { id: 2, name: '交通出行', parent_id: null, icon: '🚗', sort_order: 2 },
  { id: 3, name: '购物消费', parent_id: null, icon: '🛒', sort_order: 3 },
  { id: 4, name: '住房居住', parent_id: null, icon: '🏠', sort_order: 4 },
  { id: 5, name: '娱乐休闲', parent_id: null, icon: '🎮', sort_order: 5 },
  { id: 6, name: '医疗健康', parent_id: null, icon: '💊', sort_order: 6 },
  { id: 7, name: '教育学习', parent_id: null, icon: '📚', sort_order: 7 },
  { id: 8, name: '人情往来', parent_id: null, icon: '🎁', sort_order: 8 },
  { id: 9, name: '金融保险', parent_id: null, icon: '💰', sort_order: 9 },
  { id: 10, name: '其他支出', parent_id: null, icon: '📦', sort_order: 10 },
  // 二级 - 餐饮饮食
  { id: 101, name: '早餐', parent_id: 1, icon: '🌅', sort_order: 1 },
  { id: 102, name: '午餐', parent_id: 1, icon: '☀️', sort_order: 2 },
  { id: 103, name: '晚餐', parent_id: 1, icon: '🌙', sort_order: 3 },
  { id: 104, name: '零食饮料', parent_id: 1, icon: '🍿', sort_order: 4 },
  { id: 105, name: '外卖', parent_id: 1, icon: '📱', sort_order: 5 },
  { id: 106, name: '聚餐聚会', parent_id: 1, icon: '🥂', sort_order: 6 },
  // 二级 - 交通出行
  { id: 201, name: '公交地铁', parent_id: 2, icon: '🚌', sort_order: 1 },
  { id: 202, name: '出租车', parent_id: 2, icon: '🚕', sort_order: 2 },
  { id: 203, name: '网约车', parent_id: 2, icon: '📲', sort_order: 3 },
  { id: 204, name: '加油充电', parent_id: 2, icon: '⛽', sort_order: 4 },
  { id: 205, name: '停车费', parent_id: 2, icon: '🅿️', sort_order: 5 },
  { id: 206, name: '火车飞机', parent_id: 2, icon: '🚄', sort_order: 6 },
  // 二级 - 购物消费
  { id: 301, name: '服饰鞋包', parent_id: 3, icon: '👗', sort_order: 1 },
  { id: 302, name: '数码产品', parent_id: 3, icon: '💻', sort_order: 2 },
  { id: 303, name: '家居日用', parent_id: 3, icon: '🏪', sort_order: 3 },
  { id: 304, name: '美妆护肤', parent_id: 3, icon: '💄', sort_order: 4 },
  { id: 305, name: '超市购物', parent_id: 3, icon: '🛍️', sort_order: 5 },
  // 二级 - 住房居住
  { id: 401, name: '房租', parent_id: 4, icon: '🏘️', sort_order: 1 },
  { id: 402, name: '房贷', parent_id: 4, icon: '🏦', sort_order: 2 },
  { id: 403, name: '水电燃气', parent_id: 4, icon: '💡', sort_order: 3 },
  { id: 404, name: '物业费', parent_id: 4, icon: '🏢', sort_order: 4 },
  { id: 405, name: '维修装修', parent_id: 4, icon: '🔧', sort_order: 5 },
  // 二级 - 娱乐休闲
  { id: 501, name: '电影演出', parent_id: 5, icon: '🎬', sort_order: 1 },
  { id: 502, name: '运动健身', parent_id: 5, icon: '🏋️', sort_order: 2 },
  { id: 503, name: '游戏充值', parent_id: 5, icon: '🎮', sort_order: 3 },
  { id: 504, name: '旅游度假', parent_id: 5, icon: '✈️', sort_order: 4 },
  { id: 505, name: '咖啡茶馆', parent_id: 5, icon: '☕', sort_order: 5 },
  // 二级 - 医疗健康
  { id: 601, name: '门诊挂号', parent_id: 6, icon: '🏥', sort_order: 1 },
  { id: 602, name: '药品医疗', parent_id: 6, icon: '💊', sort_order: 2 },
  { id: 603, name: '体检保健', parent_id: 6, icon: '🩺', sort_order: 3 },
  { id: 604, name: '住院治疗', parent_id: 6, icon: '🚑', sort_order: 4 },
  // 二级 - 教育学习
  { id: 701, name: '书籍资料', parent_id: 7, icon: '📖', sort_order: 1 },
  { id: 702, name: '培训课程', parent_id: 7, icon: '🎓', sort_order: 2 },
  { id: 703, name: '考试报名', parent_id: 7, icon: '📝', sort_order: 3 },
  { id: 704, name: '文具用品', parent_id: 7, icon: '✏️', sort_order: 4 },
  // 二级 - 人情往来
  { id: 801, name: '送礼红包', parent_id: 8, icon: '🧧', sort_order: 1 },
  { id: 802, name: '请客吃饭', parent_id: 8, icon: '🍽️', sort_order: 2 },
  { id: 803, name: '孝敬长辈', parent_id: 8, icon: '👴', sort_order: 3 },
  { id: 804, name: '婚礼份子', parent_id: 8, icon: '💒', sort_order: 4 },
  // 二级 - 金融保险
  { id: 901, name: '保险缴费', parent_id: 9, icon: '🛡️', sort_order: 1 },
  { id: 902, name: '贷款利息', parent_id: 9, icon: '📊', sort_order: 2 },
  { id: 903, name: '手续费', parent_id: 9, icon: '💳', sort_order: 3 },
  { id: 904, name: '投资亏损', parent_id: 9, icon: '📉', sort_order: 4 },
  // 二级 - 其他支出
  { id: 1001, name: '快递物流', parent_id: 10, icon: '📦', sort_order: 1 },
  { id: 1002, name: '宠物支出', parent_id: 10, icon: '🐾', sort_order: 2 },
  { id: 1003, name: '捐赠公益', parent_id: 10, icon: '💝', sort_order: 3 },
  { id: 1004, name: '其他杂项', parent_id: 10, icon: '📌', sort_order: 4 },
];
