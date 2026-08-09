import { Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Home from './pages/Home';
import AddBill from './pages/AddBill';
import Bills from './pages/BillList';
import Statistics from './pages/Statistics';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="add" element={<AddBill />} />
          <Route path="bills" element={<Bills />} />
          <Route path="statistics" element={<Statistics />} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}

export default App;
