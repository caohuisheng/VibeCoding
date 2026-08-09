import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Statistic, Button, List, Tag } from 'antd';
import { PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useBillStore } from '../store/useBillStore';
import { formatAmount, formatDate, formatAmountWithType, getAmountColor } from '../utils/format';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { bills, monthlySummary, loadBills, loadCategories, loadMonthlySummary, refreshFlag } = useBillStore();

  useEffect(() => {
    loadCategories();
    loadBills();
    loadMonthlySummary();
  }, [loadCategories, loadBills, loadMonthlySummary, refreshFlag]);

  const summary = monthlySummary || { month_expense: 0, month_income: 0, today_expense: 0, today_income: 0 };
  const monthBalance = summary.month_income - summary.month_expense;

  // 近期账单（最近7条）
  const recentBills = bills.slice(0, 7);

  return (
    <div className="home-page">
      {/* 头部 */}
      <div className="home-header">
        <h1 className="app-title">黑马记账</h1>
        <p className="app-subtitle">每一笔，都算数</p>
      </div>

      {/* 统计卡片 — 第一行：本月收入/支出/结余 */}
      <div className="stats-row">
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="本月收入"
            value={summary.month_income}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: 20 }}
          />
        </Card>
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="本月支出"
            value={summary.month_expense}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#ff4d4f', fontWeight: 600, fontSize: 20 }}
          />
        </Card>
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="本月结余"
            value={monthBalance}
            precision={2}
            prefix="¥"
            valueStyle={{ color: monthBalance >= 0 ? '#1677ff' : '#ff4d4f', fontWeight: 600, fontSize: 20 }}
          />
        </Card>
      </div>

      {/* 统计卡片 — 第二行：今日收入/支出 */}
      <div className="stats-row" style={{ marginTop: 8 }}>
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="今日收入"
            value={summary.today_income}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#52c41a', fontWeight: 600 }}
          />
        </Card>
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="今日支出"
            value={summary.today_expense}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#ff4d4f', fontWeight: 600 }}
          />
        </Card>
      </div>

      {/* 快捷记账 */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        block
        className="quick-add-btn"
        onClick={() => navigate('/add')}
      >
        记一笔
      </Button>

      {/* 近期账单 */}
      <div className="recent-section">
        <div className="section-header">
          <h3>近期账单</h3>
          <Button
            type="link"
            size="small"
            onClick={() => navigate('/bills')}
          >
            查看全部 <ArrowRightOutlined />
          </Button>
        </div>
        {recentBills.length > 0 ? (
          <List
            dataSource={recentBills}
            renderItem={(bill) => (
              <List.Item className="recent-bill-item">
                <div className="bill-left">
                  <span className="bill-icon">{bill.category_icon}</span>
                  <div>
                    <div className="bill-cat">{bill.category_name}</div>
                    <div className="bill-date">{formatDate(bill.date)}</div>
                  </div>
                </div>
                <div className="bill-right">
                  <span className="bill-amount-text" style={{ color: getAmountColor(bill.bill_type) }}>
                    {formatAmountWithType(bill.amount, bill.bill_type)}
                  </span>
                  {bill.note && (
                    <Tag color="default" className="bill-note-tag">
                      {bill.note}
                    </Tag>
                  )}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <div className="empty-hint">
            <p>还没有账单记录</p>
            <p>点击上方按钮开始记账吧 ✍️</p>
          </div>
        )}
      </div>
    </div>
  );
}
