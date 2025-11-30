import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import RouterList from '@/components/RouterList';
import './styles/global.css';
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const app = createRoot(document.getElementById('root')!);
app.render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#42b983',
        borderRadius: 4,
      },
    }}
    componentSize="middle"
    locale={zhCN}
  >
    <HeroUIProvider>
      <RouterList />
    </HeroUIProvider>
  </ConfigProvider>
);
