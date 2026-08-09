import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout } from 'antd';
import {
  HomeOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import './index.css';

const { Content, Footer } = AntLayout;

const tabs = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/add', label: '记账', icon: <PlusCircleOutlined /> },
  { key: '/bills', label: '账单', icon: <UnorderedListOutlined /> },
  { key: '/statistics', label: '统计', icon: <PieChartOutlined /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // 判断当前活跃的 tab
  const activeKey = '/' + location.pathname.split('/')[1];

  return (
    <AntLayout className="app-layout">
      <Content className="app-content">
        <Outlet />
      </Content>
      <Footer className="app-footer">
        <div className="tab-bar">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`tab-item ${activeKey === tab.key ? 'active' : ''}`}
              onClick={() => navigate(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </div>
          ))}
        </div>
      </Footer>
    </AntLayout>
  );
}
