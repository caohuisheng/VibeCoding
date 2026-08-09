import { create } from 'zustand';
import type { BillFilter, BillWithCategory, Category } from '../types';
import { getCategories, getBills, getMonthlyStats, getCategoryStats } from '../db';
import type { MonthlyStats, CategoryStats } from '../types';

interface BillStore {
  // 分类数据
  categories: Category[];
  loadCategories: () => Promise<void>;

  // 账单数据
  bills: BillWithCategory[];
  loading: boolean;
  loadBills: (filter?: BillFilter) => Promise<void>;

  // 统计数据
  monthlyStats: MonthlyStats[];
  categoryStats: CategoryStats[];
  loadMonthlyStats: () => Promise<void>;
  loadCategoryStats: (month: string) => Promise<void>;

  // 刷新标记
  refreshFlag: number;
  triggerRefresh: () => void;
}

export const useBillStore = create<BillStore>((set) => ({
  categories: [],
  loadCategories: async () => {
    const cats = await getCategories();
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
  loadMonthlyStats: async () => {
    const stats = await getMonthlyStats();
    set({ monthlyStats: stats });
  },
  loadCategoryStats: async (month: string) => {
    const stats = await getCategoryStats(month);
    set({ categoryStats: stats });
  },

  refreshFlag: 0,
  triggerRefresh: () => set((s) => ({ refreshFlag: s.refreshFlag + 1 })),
}));
