import { useEffect, useState } from 'react';
import { DatePicker, Empty, Segmented } from 'antd';
import dayjs from 'dayjs';
import type { BillType } from '../types';
import { useBillStore } from '../store/useBillStore';
import { PieChart, BarChart, CategoryRanking } from '../components/Charts';
import { getCurrentMonth } from '../utils/format';

const { MonthPicker } = DatePicker;

export default function Statistics() {
  const {
    monthlyStats,
    categoryStats,
    loadMonthlyStats,
    loadCategoryStats,
    refreshFlag,
  } = useBillStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [statsType, setStatsType] = useState<BillType>('expense');

  const typeLabel = statsType === 'expense' ? '支出' : '收入';

  useEffect(() => {
    loadMonthlyStats(statsType);
  }, [loadMonthlyStats, statsType, refreshFlag]);

  useEffect(() => {
    loadCategoryStats(selectedMonth, statsType);
  }, [loadCategoryStats, selectedMonth, statsType, refreshFlag]);

  const hasData = monthlyStats.length > 0;

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        统计分析
      </h2>

      {/* 收支类型切换 */}
      <Segmented
        block
        value={statsType}
        onChange={(val) => setStatsType(val as BillType)}
        options={[
          { label: '💸 支出', value: 'expense' },
          { label: '💰 收入', value: 'income' },
        ]}
        style={{ marginBottom: 12 }}
      />

      {/* 月份选择 */}
      <MonthPicker
        value={dayjs(selectedMonth)}
        onChange={(d) => d && setSelectedMonth(d.format('YYYY-MM'))}
        style={{ marginBottom: 20, width: '100%' }}
        allowClear={false}
      />

      {!hasData ? (
        <Empty description="暂无数据，先记一笔吧" style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* 月度趋势 */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '16px 8px',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
              📊 月度{typeLabel}趋势
            </h3>
            <BarChart data={monthlyStats} label={typeLabel} />
          </div>

          {/* 分类占比 */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '16px 8px',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
              🍩 {selectedMonth} {typeLabel}分类占比
            </h3>
            {categoryStats.length > 0 ? (
              <PieChart data={categoryStats} />
            ) : (
              <Empty description={`${selectedMonth} 暂无${typeLabel}`} />
            )}
          </div>

          {/* 排行榜 */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              🏆 分类{typeLabel}排行
            </h3>
            <CategoryRanking data={categoryStats} />
          </div>
        </>
      )}
    </div>
  );
}
