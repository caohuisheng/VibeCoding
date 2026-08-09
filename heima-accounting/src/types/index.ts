// ===== 收支类型 =====
export type BillType = 'expense' | 'income';

// ===== 分类类型 =====
export interface Category {
  id: number;
  name: string;
  parent_id: number | null; // 一级分类为 null，二级分类指向父分类ID
  icon: string; // emoji 图标
  sort_order: number;
  bill_type: BillType; // 所属收支类型
}

// 带子分类的一级分类（用于分类选择器）
export interface CategoryWithChildren extends Category {
  children: Category[];
}

// ===== 账单类型 =====
export interface Bill {
  id: number;
  amount: number; // 金额（元），精确到小数点后两位
  category_id: number; // 关联二级分类ID
  date: string; // 日期 YYYY-MM-DD
  note: string; // 备注
  bill_type: BillType; // 收支类型
  created_at: string;
}

// 带分类信息的账单（JOIN 查询结果，用于列表展示）
export interface BillWithCategory extends Bill {
  category_name: string; // 二级分类名
  category_icon: string; // 二级分类图标
  parent_category_id: number; // 一级分类ID
  parent_category_name: string; // 一级分类名
  parent_category_icon: string; // 一级分类图标
}

// ===== 统计类型 =====
export interface MonthlyStats {
  month: string; // YYYY-MM
  total: number; // 当月总金额
  count: number; // 当月账单数
}

export interface CategoryStats {
  category_id: number;
  category_name: string;
  category_icon: string;
  parent_category_name: string;
  total: number; // 该分类总金额
  percentage: number; // 占比
}

export interface MonthlySummary {
  month_expense: number;
  month_income: number;
  today_expense: number;
  today_income: number;
}

// ===== 账单表单类型 =====
export interface BillFormData {
  amount: number;
  category_id: number;
  bill_type: BillType;
  date: string;
  note: string;
}

// ===== 筛选条件 =====
export interface BillFilter {
  month?: string; // YYYY-MM
  category_id?: number;
  keyword?: string;
  bill_type?: BillType; // 收支类型筛选
}
