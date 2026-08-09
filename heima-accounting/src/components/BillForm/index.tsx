import { useState } from 'react';
import { Input, DatePicker, Button, Segmented, message } from 'antd';
import { CalendarOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Category, BillType } from '../../types';
import CategorySelector from '../CategorySelector';
import { addBill } from '../../db';
import { useBillStore } from '../../store/useBillStore';
import { getToday } from '../../utils/format';
import './index.css';

const { TextArea } = Input;

const EXPENSE_QUICK = [10, 20, 50, 100, 200];
const INCOME_QUICK = [100, 500, 1000, 5000, 10000];

export default function BillForm() {
  const { triggerRefresh } = useBillStore();

  // 表单状态
  const [billType, setBillType] = useState<BillType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');
  const [showCategory, setShowCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const typeLabel = billType === 'expense' ? '支出' : '收入';
  const quickAmounts = billType === 'expense' ? EXPENSE_QUICK : INCOME_QUICK;

  // 金额输入处理（限制小数点后两位）
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  // 快速金额按钮
  const addAmount = (n: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev || '0');
      return (current + n).toFixed(2);
    });
  };

  // 提交
  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      message.warning('请输入有效金额');
      return;
    }
    if (!selectedCategory) {
      message.warning('请选择分类');
      return;
    }
    setSubmitting(true);
    try {
      await addBill(amt, selectedCategory.id, date, note, billType);
      message.success('记账成功！');
      // 重置表单
      setAmount('');
      setSelectedCategory(null);
      setDate(getToday());
      setNote('');
      triggerRefresh();
    } catch {
      message.error('记账失败，请重试');
    }
    setSubmitting(false);
  };

  return (
    <div className="bill-form">
      {/* 收支类型切换 */}
      <Segmented
        block
        size="large"
        value={billType}
        onChange={(val) => {
          setBillType(val as BillType);
          setSelectedCategory(null);
        }}
        options={[
          { label: '💸 支出', value: 'expense' },
          { label: '💰 收入', value: 'income' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* 金额输入区 */}
      <div className="amount-section">
        <div className="amount-label">{typeLabel}金额</div>
        <div className="amount-input-wrapper">
          <span className={`currency-symbol ${billType}`}>¥</span>
          <input
            className="amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            autoFocus
          />
        </div>
        <div className="quick-amounts">
          {quickAmounts.map((n) => (
            <Button key={n} size="small" onClick={() => addAmount(n)}>
              +{n}
            </Button>
          ))}
        </div>
      </div>

      {/* 分类选择 */}
      <div className="form-row" onClick={() => setShowCategory(true)}>
        <span className="form-row-label">{typeLabel}分类</span>
        <span className="form-row-value">
          {selectedCategory ? (
            <>
              {selectedCategory.icon} {selectedCategory.name}
            </>
          ) : (
            <span className="placeholder">{billType === 'expense' ? '请选择支出分类' : '请选择收入分类'}</span>
          )}
        </span>
        <span className="form-row-arrow">›</span>
      </div>

      {/* 日期选择 */}
      <div className="form-row">
        <span className="form-row-label">
          <CalendarOutlined style={{ marginRight: 8 }} />
          日期
        </span>
        <DatePicker
          value={dayjs(date)}
          onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
          style={{ border: 'none', boxShadow: 'none' }}
        />
      </div>

      {/* 备注 */}
      <div className="form-row" style={{ alignItems: 'flex-start' }}>
        <span className="form-row-label">
          <EditOutlined style={{ marginRight: 8 }} />
          备注
        </span>
        <TextArea
          placeholder="添加备注（选填）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          variant="borderless"
          style={{ flex: 1, padding: 0 }}
        />
      </div>

      {/* 提交按钮 */}
      <Button
        type="primary"
        block
        size="large"
        onClick={handleSubmit}
        loading={submitting}
        disabled={!amount || !selectedCategory}
        style={{ marginTop: 32 }}
      >
        记一笔
      </Button>

      {/* 分类选择弹窗 */}
      <CategorySelector
        visible={showCategory}
        billType={billType}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategory(false)}
      />
    </div>
  );
}
