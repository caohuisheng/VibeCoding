import ReactECharts from 'echarts-for-react';
import type { CategoryStats, MonthlyStats } from '../../types';

interface PieChartProps {
  data: CategoryStats[];
}

/** 饼图：分类支出占比 */
export function PieChart({ data }: PieChartProps) {
  const option = {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: ¥{c} ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data: data.map((d) => ({
          name: d.category_name,
          value: parseFloat(d.total.toFixed(2)),
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} />;
}

interface BarChartProps {
  data: MonthlyStats[];
  label?: string;
}

/** 柱状图：月度趋势 */
export function BarChart({ data, label = '金额' }: BarChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: `{b}<br/>${label}: ¥{c}`,
    },
    grid: {
      left: 16,
      right: 16,
      top: 16,
      bottom: 16,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.month),
      axisLabel: {
        formatter: (val: string) => val.substring(5), // 显示 MM 部分
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (val: number) => `¥${val}`,
      },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => parseFloat(d.total.toFixed(2))),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: '#1677ff',
        },
        barMaxWidth: 40,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260 }} />;
}

interface RankingProps {
  data: CategoryStats[];
}

/** 分类支出排行榜 */
export function CategoryRanking({ data }: RankingProps) {
  const sorted = [...data].sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div style={{ padding: '0 8px' }}>
      {sorted.map((item, index) => (
        <div
          key={item.category_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: index < 3 ? '#1677ff' : '#d9d9d9',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span style={{ fontSize: 20, marginRight: 10 }}>{item.category_icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: '#333' }}>{item.category_name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {item.parent_category_name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
              ¥{item.total.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          暂无数据
        </div>
      )}
    </div>
  );
}
