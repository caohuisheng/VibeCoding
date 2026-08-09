import { useState, useEffect } from 'react';
import { Modal } from 'antd';
import type { Category } from '../../types';
import { useBillStore } from '../../store/useBillStore';
import './index.css';

interface Props {
  visible: boolean;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export default function CategorySelector({ visible, onSelect, onClose }: Props) {
  const { categories } = useBillStore();
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

  // 一级分类
  const parentCategories = categories.filter((c) => c.parent_id === null);
  // 当前选中的二级分类
  const childCategories = categories.filter(
    (c) => c.parent_id === selectedParent?.id
  );

  // 关闭时重置
  useEffect(() => {
    if (!visible) {
      setSelectedParent(null);
    }
  }, [visible]);

  const handleParentClick = (cat: Category) => {
    setSelectedParent(cat);
  };

  const handleChildClick = (cat: Category) => {
    onSelect(cat);
    onClose();
  };

  const handleBack = () => {
    setSelectedParent(null);
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title={
        selectedParent
          ? `选择「${selectedParent.name}」小类`
          : '选择支出一级分类'
      }
      width={360}
    >
      {!selectedParent ? (
        // 一级分类列表
        <div className="category-grid">
          {parentCategories.map((cat) => (
            <div
              key={cat.id}
              className="category-item"
              onClick={() => handleParentClick(cat)}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>
      ) : (
        // 二级分类 + 返回按钮
        <div>
          <div className="category-back" onClick={handleBack}>
            ← 返回一级分类
          </div>
          <div className="category-grid">
            {childCategories.map((cat) => (
              <div
                key={cat.id}
                className="category-item"
                onClick={() => handleChildClick(cat)}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
