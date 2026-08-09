import { create } from 'zustand';
import type { BillFilter, BillWithCategory, Category, BillType, MonthlySummary } from '../types';
import { getCategories, getBills, getMonthlyStats, getCategoryStats, getMonthlySummary } from '../db';
import type { MonthlyStats, CategoryStats } from '../types';
import { getCurrentMonth, getToday } from '../utils/format';

interface BillStore {
  // 分类数据
  categories: Category[];
  loadCategories: (billType?: BillType) => Promise<void>;

  // 账单数据
  bills: BillWithCategory[];
  loading: boolean;
  loadBills: (filter?: BillFilter) => Promise<void>;

  // 统计数据
  monthlyStats: MonthlyStats[];
  categoryStats: CategoryStats[];
  loadMonthlyStats: (billType?: BillType) => Promise<void>;
  loadCategoryStats: (month: string, billType?: BillType) => Promise<void>;

  // 月度汇总
  monthlySummary: MonthlySummary | null;
  loadMonthlySummary: () => Promise<void>;

  // 刷新标记
  refreshFlag: number;
  triggerRefresh: () => void;
}

export const useBillStore = create<BillStore>((set) => ({
  categories: [],
  loadCategories: async (billType?: BillType) => {
    const cats = await getCategories(billType);
    set({ categories: cats });
  },

  bills: [],
  loading: false,
  loadBills: async (filter?: BillFilter) => {
    set({ loading: true });
    const bills = await getBills(filter);
    set({ bills, loading: false });
  },

  monthlyStats: [],
  categoryStats: [],
  loadMonthlyStats: async (billType?: BillType) => {
    const stats = await getMonthlyStats(billType);
    set({ monthlyStats: stats });
  },
  loadCategoryStats: async (month: string, billType?: BillType) => {
    const stats = await getCategoryStats(month, billType);
    set({ categoryStats: stats });
  },

  monthlySummary: null,
  loadMonthlySummary: async () => {
    const summary = await getMonthlySummary(getCurrentMonth(), getToday());
    set({ monthlySummary: summary });
  },

  refreshFlag: 0,
  triggerRefresh: () => set((s) => ({ refreshFlag: s.refreshFlag + 1 })),
}));
