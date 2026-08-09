import { List, Tag, Empty, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { BillWithCategory } from '../../types';
import { formatAmountWithType, getAmountColor, formatDate } from '../../utils/format';
import './index.css';

interface Props {
  bills: BillWithCategory[];
  loading?: boolean;
  onEdit?: (bill: BillWithCategory) => void;
  onDelete?: (id: number) => Promise<void>;
}

export default function BillListView({ bills, loading, onEdit, onDelete }: Props) {
  const handleDelete = async (id: number) => {
    try {
      await onDelete?.(id);
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  if (!loading && bills.length === 0) {
    return (
      <Empty
        description="暂无账单记录"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 60 }}
      />
    );
  }

  return (
    <List
      loading={loading}
      dataSource={bills}
      renderItem={(bill) => (
        <List.Item
          key={bill.id}
          className="bill-item"
          actions={[
            onEdit && (
              <EditOutlined
                key="edit"
                className="bill-action-icon"
                onClick={() => onEdit(bill)}
              />
            ),
            onDelete && (
              <Popconfirm
                key="delete"
                title="确认删除这条账单？"
                onConfirm={() => handleDelete(bill.id)}
                okText="确认"
                cancelText="取消"
              >
                <DeleteOutlined className="bill-action-icon bill-delete-icon" />
              </Popconfirm>
            ),
          ].filter(Boolean)}
        >
          <List.Item.Meta
            avatar={
              <span className="bill-category-icon">
                {bill.category_icon || bill.parent_category_icon}
              </span>
            }
            title={
              <div className="bill-title-row">
                <span className="bill-category-name">
                  {bill.parent_category_name} - {bill.category_name}
                </span>
                <span className="bill-amount" style={{ color: getAmountColor(bill.bill_type) }}>
                  {formatAmountWithType(bill.amount, bill.bill_type)}
                </span>
              </div>
            }
            description={
              <div className="bill-desc-row">
                <span>{formatDate(bill.date)}</span>
                <Tag color={bill.bill_type === 'income' ? 'green' : 'red'} style={{ marginLeft: 8, fontSize: 10 }}>
                  {bill.bill_type === 'income' ? '收入' : '支出'}
                </Tag>
                {bill.note && (
                  <Tag color="default" style={{ marginLeft: 4 }}>
                    {bill.note}
                  </Tag>
                )}
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}
