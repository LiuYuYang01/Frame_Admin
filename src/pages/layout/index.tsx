import { useState, useMemo } from 'react';
import { Layout, Menu, Button, message, Modal, Tooltip, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2';
import { FiHome, FiFolder, FiMap, FiUpload, FiSettings, FiMenu, FiRefreshCw } from 'react-icons/fi';
import { LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router';
import { useUserStore, useTabsStore, useConfigStore, isLightSidebarStyle } from '@/stores';
import LogoSvg from '@/assets/svg/logo.svg';
import PageTab from './components/PageTab';
import SettingsDrawer from './components/SettingsDrawer';
import HeaderUser from './components/HeaderUser';
import './index.scss';

const { Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <FiHome />, label: '首页' },
  { key: '/albums', icon: <FiFolder />, label: '相册管理' },
  { key: '/footprint', icon: <FiMap />, label: '足迹管理' },
  { key: '/upload', icon: <FiUpload />, label: '上传图片' },
  { key: '/setup', icon: <FiSettings />, label: '系统配置' },
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sidebarStyle = useConfigStore((s) => s.sidebarStyle);
  const colorMode = useConfigStore((s) => s.colorMode);
  const setColorMode = useConfigStore((s) => s.setColorMode);
  const isLightSidebar = isLightSidebarStyle(colorMode, sidebarStyle);
  const isDarkMode = colorMode === 'dark';

  const navigate = useNavigate();
  const location = useLocation();

  const userStore = useUserStore();
  const tabsStore = useTabsStore();

  // 页面刷新计数：变化时通过 key 重挂载 Outlet
  const refreshIndex = useConfigStore((s) => s.refreshPageRouteIndexes[location.pathname] || 0);

  // 静态菜单的选中 key：精确匹配失败后按前缀匹配（支持 /albums/:id 详情页）
  const selectedKey = useMemo(() => {
    const matched = menuItems.find(
      (item) => item && 'key' in item && (item.key === location.pathname || location.pathname.startsWith(`${item.key}/`))
    );
    return (matched?.key as string) || location.pathname;
  }, [location.pathname]);

  const handleLogout = () => {
    Modal.confirm({
      title: '退出登录',
      content: '确定退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        userStore.quitLogin();
        tabsStore.clearTabs();
        message.success('退出成功');
        navigate('/login');
      },
    });
  };

  const renderLogo = (compact: boolean) => (
    <NavLink to="/" className={`flex items-center overflow-hidden ${compact ? 'justify-center' : 'gap-2.5'}`}>
      <img src={LogoSvg} alt="logo" className="h-7 w-7 shrink-0" />
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className={`text-[15px] font-semibold ${isLightSidebar ? 'text-ink' : 'text-rail-ink-text-strong'}`}>
            Frame
          </span>
          <span className={`text-[10px] ${isLightSidebar ? 'text-ink-faint' : 'text-rail-ink-text'}`}>
            图片管理系统
          </span>
        </div>
      )}
    </NavLink>
  );

  const renderMenu = (inDrawer = false) => (
    <Menu
      theme={isLightSidebar ? 'light' : 'dark'}
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      rootClassName={!inDrawer && !isLightSidebar ? 'custom-saas-menu-popup' : undefined}
      onClick={({ key }) => {
        navigate(key);
        tabsStore.setActiveTab(key);
        if (inDrawer) setMobileMenuOpen(false);
      }}
      className={`border-none bg-transparent! custom-saas-menu ${isLightSidebar ? 'custom-saas-menu-light' : ''} ${
        !inDrawer && collapsed ? 'custom-saas-menu-collapsed' : ''
      }`}
    />
  );

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0, padding: 0 }}>
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'row' }} className="h-screen bg-canvas font-sans">
        {/* 墨蓝侧栏：Logo + 菜单，整条通高 */}
        <Sider
          width={232}
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={isLightSidebar ? 'light' : 'dark'}
          className={`${isLightSidebar ? 'bg-transparent!' : 'bg-rail-ink!'} hidden md:block z-40`}
          breakpoint="md"
          collapsedWidth={72}
          style={isLightSidebar ? { background: 'linear-gradient(180deg, #ffffff 0%, #dfecff 100%)' } : undefined}
        >
          <div className={`flex h-full flex-col ${isLightSidebar ? 'bg-transparent' : 'bg-rail-ink'}`}>
            <div
              className={`flex h-14 shrink-0 items-center justify-center ${
                isLightSidebar ? 'border-b border-line' : 'border-b border-rail-ink-line'
              } ${collapsed ? 'justify-center px-2' : 'px-4'}`}
            >
              {renderLogo(collapsed)}
            </div>

            <div
              className={`flex-1 overflow-y-auto saas-sidebar-scroll pt-2 ${
                isLightSidebar ? 'saas-sidebar-scroll-light' : ''
              }`}
            >
              {renderMenu()}
            </div>
          </div>
        </Sider>

        <Layout className="bg-canvas! flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* 顶栏：折叠/刷新 + 标签 + 工具区 + 用户 */}
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:px-3 md:px-4">
            <Button
              type="text"
              className="text-ink-muted! hover:bg-canvas! hover:text-ink! md:hidden!"
              icon={<FiMenu />}
              onClick={() => setMobileMenuOpen(true)}
            />

            <Button
              type="text"
              className="text-ink-muted! hover:bg-canvas! hover:text-ink! hidden md:flex"
              icon={collapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
              onClick={() => setCollapsed(!collapsed)}
            />

            <Tooltip title="刷新">
              <Button
                type="text"
                className="text-ink-muted! hover:bg-canvas! hover:text-ink!"
                icon={<FiRefreshCw />}
                onClick={() => useConfigStore.getState().triggerPageRefresh(location.pathname)}
              />
            </Tooltip>

            {/* 标签：占据左侧操作与右侧工具区之间的弹性空间 */}
            <div className="hidden h-full min-w-0 flex-1 items-center overflow-hidden md:flex">
              <PageTab />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Tooltip title={isDarkMode ? '切换浅色模式' : '切换深色模式'}>
                <Button
                  type="text"
                  className="text-ink-muted! hover:bg-canvas! hover:text-ink!"
                  icon={isDarkMode ? <HiOutlineSun className="size-4" /> : <HiOutlineMoon className="size-4" />}
                  onClick={() => setColorMode(isDarkMode ? 'light' : 'dark')}
                />
              </Tooltip>

              <Tooltip title="设置中心">
                <Button
                  type="text"
                  className="text-ink-muted! hover:bg-canvas! hover:text-ink!"
                  icon={<FiSettings />}
                  onClick={() => setSettingsOpen(true)}
                />
              </Tooltip>

              <HeaderUser data={userStore.user} handleLogout={handleLogout} />
            </div>
          </div>

          <Content
            className="m-2 sm:m-3 md:m-4 flex flex-1 flex-col overflow-y-auto"
            style={{ marginBottom: 16, minHeight: 0 }}
          >
            <Outlet key={refreshIndex} />
          </Content>
        </Layout>

        {/* 移动端抽屉菜单 */}
        <Drawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={232}
          className="sm:hidden [&>.ant-drawer-header]:h-0 [&>.ant-drawer-header]:p-0!"
          styles={{
            body: {
              padding: 0,
              background: isLightSidebar ? 'linear-gradient(180deg, #ffffff 0%, #dfecff 100%)' : '#0E1626',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <div
            className={`flex h-14 shrink-0 items-center px-4 ${
              isLightSidebar ? 'border-b border-line' : 'border-b border-rail-ink-line'
            }`}
          >
            {renderLogo(false)}
          </div>
          <div
            className={`flex-1 overflow-y-auto saas-sidebar-scroll pt-2 ${
              isLightSidebar ? 'saas-sidebar-scroll-light' : ''
            }`}
          >
            {renderMenu(true)}
          </div>
        </Drawer>

        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Layout>
    </div>
  );
};

export default MainLayout;
