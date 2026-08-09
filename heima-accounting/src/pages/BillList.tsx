import { useEffect, useState, useCallback } from 'react';
import { DatePicker, Select } from 'antd';

import dayjs from 'dayjs';
import { useBillStore } from '../store/useBillStore';
import BillListView from '../components/BillList';
import { deleteBill } from '../db';

const { MonthPicker } = DatePicker;

export default function Bills() {
  const { bills, loading, categories, loadBills, loadCategories, refreshFlag } =
    useBillStore();
  const [filterMonth, setFilterMonth] = useState<string | undefined>();
  const [filterCategory, setFilterCategory] = useState<number | undefined>();

  const reload = useCallback(() => {
    loadBills({
      month: filterMonth,
      category_id: filterCategory,
    });
  }, [loadBills, filterMonth, filterCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    reload();
  }, [reload, refreshFlag]);

  const handleDelete = async (id: number) => {
    await deleteBill(id);
    reload();
  };

  // 一级分类选项（用于筛选）
  const parentCategories = categories.filter((c) => c.parent_id === null);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        账单列表
      </h2>

      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <MonthPicker
          placeholder="选择月份"
          value={filterMonth ? dayjs(filterMonth) : null}
          onChange={(d) =>
            setFilterMonth(d ? d.format('YYYY-MM') : undefined)
          }
          allowClear
          style={{ flex: 1 }}
        />
        <Select
          placeholder="选择分类"
          value={filterCategory}
          onChange={setFilterCategory}
          allowClear
          style={{ flex: 1 }}
          options={parentCategories.map((c) => ({
            label: `${c.icon} ${c.name}`,
            value: c.id,
          }))}
        />
      </div>

      {/* 账单列表 */}
      <BillListView
        bills={bills}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  );
}
