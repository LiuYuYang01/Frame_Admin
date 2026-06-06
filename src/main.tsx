import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import RouterList from '@/components/RouterList';
import './styles/global.css';
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useConfigStore } from '@/stores';

const App = () => {
  const colorMode = useConfigStore((state) => state.colorMode);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#60a5fa',
          borderRadius: 8,
          colorBgBase: colorMode === 'dark' ? '#263444' : '#ffffff',
          colorTextBase: colorMode === 'dark' ? '#e0e0e0' : '#000000',
          ...(colorMode === 'dark' && {
            colorBgLayout: '#263444',
            colorBgContainer: '#263444',
            colorBgElevated: '#263444',
            colorBgSpotlight: '#263444',
          }),
        },
        algorithm: colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
      componentSize="middle"
      locale={zhCN}
    >
      <HeroUIProvider>
        <AntdApp>
          <RouterList />
        </AntdApp>
      </HeroUIProvider>
    </ConfigProvider>
  );
};

const app = createRoot(document.getElementById('root')!);
app.render(<App />);
