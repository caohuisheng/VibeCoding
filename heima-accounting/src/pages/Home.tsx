import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Statistic, Button, List, Tag } from 'antd';
import { PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useBillStore } from '../store/useBillStore';
import { formatAmount, formatDate, getCurrentMonth, getToday } from '../utils/format';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { bills, loadBills, loadCategories, refreshFlag } = useBillStore();
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

  const currentMonth = getCurrentMonth();
  const today = getToday();

  useEffect(() => {
    loadCategories();
    loadBills();
  }, [loadCategories, loadBills, refreshFlag]);

  // 计算本月合计和今日合计
  useEffect(() => {
    let month = 0;
    let todaySum = 0;
    bills.forEach((b) => {
      if (b.date.startsWith(currentMonth)) {
        month += b.amount;
      }
      if (b.date === today) {
        todaySum += b.amount;
      }
    });
    setMonthTotal(month);
    setTodayTotal(todaySum);
  }, [bills, currentMonth, today]);

  // 近期账单（最近7条）
  const recentBills = bills.slice(0, 7);

  return (
    <div className="home-page">
      {/* 头部 */}
      <div className="home-header">
        <h1 className="app-title">黑马记账</h1>
        <p className="app-subtitle">每一笔，都算数</p>
      </div>

      {/* 统计卡片 */}
      <div className="stats-row">
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="本月支出"
            value={monthTotal}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#1677ff', fontWeight: 600 }}
          />
        </Card>
        <Card className="stat-card" bordered={false}>
          <Statistic
            title="今日支出"
            value={todayTotal}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#52c41a', fontWeight: 600 }}
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
                  <span className="bill-amount-text">
                    -{formatAmount(bill.amount)}
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
