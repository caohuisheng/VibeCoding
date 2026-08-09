import { useEffect, useState } from 'react';
import { DatePicker, Empty } from 'antd';
import dayjs from 'dayjs';
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

  useEffect(() => {
    loadMonthlyStats();
  }, [loadMonthlyStats, refreshFlag]);

  useEffect(() => {
    loadCategoryStats(selectedMonth);
  }, [loadCategoryStats, selectedMonth, refreshFlag]);

  const hasData = monthlyStats.length > 0;

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        统计分析
      </h2>

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
              📊 月度支出趋势
            </h3>
            <BarChart data={monthlyStats} />
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
              🍩 {selectedMonth} 分类占比
            </h3>
            {categoryStats.length > 0 ? (
              <PieChart data={categoryStats} />
            ) : (
              <Empty description={`${selectedMonth} 暂无支出`} />
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
              🏆 分类支出排行
            </h3>
            <CategoryRanking data={categoryStats} />
          </div>
        </>
      )}
    </div>
  );
}
