import { useEffect } from 'react';
import { useBillStore } from '../store/useBillStore';
import BillForm from '../components/BillForm';

export default function AddBill() {
  const { loadCategories, categories } = useBillStore();

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [loadCategories, categories.length]);

  return (
    <div>
      <h2 style={{ padding: '16px 16px 0', fontSize: 20, fontWeight: 600 }}>
        记一笔
      </h2>
      <BillForm />
    </div>
  );
}
