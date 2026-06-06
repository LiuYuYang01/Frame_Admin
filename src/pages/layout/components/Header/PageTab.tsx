import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { AiOutlineClose } from 'react-icons/ai';
import { FiHome, FiFolder, FiMap, FiUpload } from 'react-icons/fi';
import useTabsStore, { type TabItem } from '@/stores/modules/tabs';

interface RouteConfig {
  path: string;
  title: string;
  icon: React.ReactNode;
}

const routeConfigList: RouteConfig[] = [
  { path: '/', title: '首页', icon: <FiHome className="text-sm" /> },
  { path: '/albums', title: '相册管理', icon: <FiFolder className="text-sm" /> },
  { path: '/footprint', title: '足迹管理', icon: <FiMap className="text-sm" /> },
  { path: '/upload', title: '上传图片', icon: <FiUpload className="text-sm" /> },
];

const routeConfigMap: Record<string, RouteConfig> = Object.fromEntries(
  routeConfigList.map((r) => [r.path, r]),
);

export const getRouteConfig = (pathname: string): RouteConfig | null => {
  if (routeConfigMap[pathname]) return routeConfigMap[pathname];
  for (const [path, config] of Object.entries(routeConfigMap)) {
    if (path !== '/' && pathname.startsWith(path)) return config;
  }
  return null;
};

export default () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, activeTabKey, addTab, removeTab, setActiveTab } = useTabsStore();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 监听路由变化，自动添加标签
  useEffect(() => {
    const pathname = location.pathname;
    const routeConfig = getRouteConfig(pathname);
    if (routeConfig) {
      addTab({ key: pathname, title: routeConfig.title, path: pathname });
      setActiveTab(pathname);
    }
  }, [location.pathname]);

  // 滚动到指定的tab
  const scrollToTab = (path: string) => {
    const container = tabsContainerRef.current;
    const tabElement = tabRefs.current.get(path);
    if (!container || !tabElement) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    const tabLeft = tabRect.left - containerRect.left + container.scrollLeft;
    const tabRight = tabLeft + tabRect.width;
    const containerLeft = container.scrollLeft;
    const containerRight = containerLeft + containerRect.width;
    const padding = 20;

    if (tabLeft < containerLeft + padding) {
      container.scrollTo({ left: tabLeft - padding, behavior: 'smooth' });
    } else if (tabRight > containerRight - padding) {
      container.scrollTo({ left: tabRight - containerRect.width + padding, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeTabKey) {
      setTimeout(() => scrollToTab(activeTabKey), 0);
    }
  }, [activeTabKey]);

  const handleTabClick = (tab: TabItem) => {
    setActiveTab(tab.key);
    navigate(tab.path);
  };

  const performCloseTab = useCallback(
    (tab: TabItem) => {
      if (tabs.length <= 1) return;
      const currentIndex = tabs.findIndex((t) => t.key === tab.key);
      const isActiveTab = activeTabKey === tab.key;

      if (isActiveTab) {
        let newActivePath = '/';
        if (currentIndex > 0) {
          newActivePath = tabs[currentIndex - 1].path;
        } else if (tabs.length > 1) {
          newActivePath = tabs[1].path;
        }
        navigate(newActivePath);
      }
      removeTab(tab.key);
    },
    [tabs, activeTabKey, navigate, removeTab],
  );

  const handleCloseTab = (e: React.MouseEvent, tab: TabItem) => {
    e.stopPropagation();
    performCloseTab(tab);
  };

  const getContextMenuProps = (tab: TabItem): MenuProps => ({
    items: [
      { key: 'close', label: '关闭当前', disabled: tabs.length <= 1 },
      { key: 'closeOthers', label: '关闭其他', disabled: tabs.length <= 1 },
      { key: 'closeAll', label: '关闭所有' },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent?.stopPropagation();
      if (key === 'close') {
        performCloseTab(tab);
      } else if (key === 'closeOthers') {
        if (tabs.length <= 1) return;
        // 关闭其他标签，只保留当前标签
        const remaining = tabs.filter((t) => t.key === tab.key);
        useTabsStore.setState({ tabs: remaining, activeTabKey: tab.key });
        navigate(tab.path);
      } else if (key === 'closeAll') {
        useTabsStore.getState().clearTabs();
        navigate('/');
      }
    },
  });

  const getTabIcon = (path: string) => {
    const routeConfig = getRouteConfig(path);
    return routeConfig?.icon || null;
  };

  return (
    <div className="relative hidden xs:flex items-center">
      <div
        ref={tabsContainerRef}
        className="flex-1 flex items-center overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center h-10">
          {tabs.map((tab) => {
            const isActive = activeTabKey === tab.key;
            const icon = getTabIcon(tab.path);

            return (
              <Dropdown key={tab.key} trigger={['contextMenu']} menu={getContextMenuProps(tab)}>
                <div
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.key, el);
                    else tabRefs.current.delete(tab.key);
                  }}
                  onClick={() => handleTabClick(tab)}
                  className={`relative flex items-center gap-2 px-4 h-10 cursor-pointer transition-all duration-200 hover:text-primary! ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {icon && <span className="shrink-0">{icon}</span>}
                  <span className="whitespace-nowrap text-sm">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(e, tab)}
                      className="ml-1 shrink-0 w-4 h-4 flex items-center justify-center rounded-sm text-gray-300 hover:text-white hover:bg-red-500 dark:hover:bg-red-500 transition-colors cursor-pointer"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <AiOutlineClose className="text-xs" />
                    </button>
                  )}
                </div>
              </Dropdown>
            );
          })}
        </div>
      </div>
    </div>
  );
};
