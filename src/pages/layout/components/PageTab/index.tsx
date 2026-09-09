import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Dropdown } from 'antd';
import { useTabsStore } from '@/stores';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import { FiHome, FiFolder, FiMap, FiUpload, FiSettings, FiX } from 'react-icons/fi';

const pageConfigMap: Record<string, { title: string; icon: React.ReactNode }> = {
  '/': { title: '首页', icon: <FiHome /> },
  '/albums': { title: '相册管理', icon: <FiFolder /> },
  '/footprint': { title: '足迹管理', icon: <FiMap /> },
  '/upload': { title: '上传图片', icon: <FiUpload /> },
  '/setup': { title: '系统配置', icon: <FiSettings /> },
};

// 前缀匹配详情页（如 /albums/:id）到父级菜单配置
const resolveConfig = (path: string) => {
  if (pageConfigMap[path]) return pageConfigMap[path];
  const parentKey = Object.keys(pageConfigMap).find((key) => key !== '/' && path.startsWith(`${key}/`));
  return parentKey ? pageConfigMap[parentKey] : { title: '页面', icon: null };
};

export default () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, activeTabKey, addTab, removeTab, setActiveTab, clearTabs } = useTabsStore();
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const leftScrollBtnRef = useRef<HTMLButtonElement>(null);
  const rightScrollBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const path = location.pathname;
    const config = resolveConfig(path);
    addTab({ key: path, title: config.title, path, closable: path !== '/' });
  }, [location.pathname, addTab]);

  const checkScrollStatus = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowScrollLeft(scrollLeft > 1);
      setShowScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  const ensureTabVisible = useCallback(
    (key: string) => {
      const container = tabsContainerRef.current;
      if (!container) return;

      const tabEl = container.querySelector(`[data-tab-key="${key}"]`) as HTMLElement | null;
      if (!tabEl) return;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();

      const leftOverlayWidth = leftScrollBtnRef.current?.getBoundingClientRect().width ?? 0;
      const rightOverlayWidth = rightScrollBtnRef.current?.getBoundingClientRect().width ?? 0;

      const padding = 8;
      const leftLimit = containerRect.left + leftOverlayWidth + padding;
      const rightLimit = containerRect.right - rightOverlayWidth - padding;

      if (tabRect.left < leftLimit) {
        container.scrollLeft -= leftLimit - tabRect.left;
      } else if (tabRect.right > rightLimit) {
        container.scrollLeft += tabRect.right - rightLimit;
      }

      window.requestAnimationFrame(() => checkScrollStatus());
    },
    [checkScrollStatus]
  );

  const scrollTo = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 240;
      const currentScroll = tabsContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;

      tabsContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const rafId = window.requestAnimationFrame(() => checkScrollStatus());
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => checkScrollStatus());
      ro.observe(tabsContainerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [checkScrollStatus, tabs.length]);

  useEffect(() => {
    if (!activeTabKey) return;
    window.requestAnimationFrame(() => ensureTabVisible(activeTabKey));
  }, [activeTabKey, tabs.length]);

  // 滚轮横滚：在标签区优先横向滚动而不是翻页
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = tabsContainerRef.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (target && !el.contains(target)) return;

      const canScrollX = el.scrollWidth - el.clientWidth > 1;
      if (!canScrollX) return;

      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      el.scrollLeft += delta * multiplier;

      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      window.requestAnimationFrame(() => checkScrollStatus());
    };

    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', onWheel, true);
  }, [checkScrollStatus]);

  const handleTabClick = (key: string) => {
    setActiveTab(key);
    navigate(key);
  };

  const handleTabClose = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const index = tabs.findIndex((tab) => tab.key === key);
    removeTab(key);

    if (key === activeTabKey) {
      const remainingTabs = tabs.filter((tab) => tab.key !== key);
      const nextTab = remainingTabs[index] || remainingTabs[index - 1];
      if (nextTab) navigate(nextTab.key);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCloseOthers = (key: string) => {
    const newTabs = tabs.filter((tab) => tab.key === key || tab.closable === false);
    clearTabs();
    newTabs.forEach((tab) => addTab(tab));
    setActiveTab(key);
    navigate(key);
  };

  const handleCloseAll = () => {
    clearTabs();
    navigate('/');
  };

  const renderTab = (tab: { key: string; title: string; closable?: boolean }) => {
    const isActive = tab.key === activeTabKey;
    const config = pageConfigMap[tab.key]
      ? pageConfigMap[tab.key]
      : { title: tab.title, icon: resolveConfig(tab.key).icon };

    const menuItems = [
      { key: 'close', label: '关闭', onClick: () => handleTabClose(tab.key) },
      { key: 'closeOthers', label: '关闭其他', onClick: () => handleCloseOthers(tab.key) },
      { key: 'closeAll', label: '关闭所有', onClick: handleCloseAll },
    ];

    return (
      <Dropdown key={tab.key} menu={{ items: menuItems }} trigger={['contextMenu']} placement="bottomRight">
        <div
          onClick={() => handleTabClick(tab.key)}
          onContextMenu={handleContextMenu}
          data-tab-key={tab.key}
          className={`
            group relative inline-flex h-8 max-w-48 cursor-pointer select-none items-center gap-1.5 rounded-md
            px-3 text-[13px] font-medium active:bg-row-hover
            ${
              isActive
                ? 'bg-brand-soft font-semibold text-brand'
                : 'bg-transparent text-ink-muted hover:bg-row-hover hover:text-ink'
            }
          `}
        >
          {config.icon && (
            <span className="flex shrink-0 items-center text-[13px]! [&_svg]:size-3.5">{config.icon}</span>
          )}
          <span className="flex-1 truncate pr-0.5">{config.title}</span>

          {tab.closable !== false && (
            <FiX
              className={`
                shrink-0 rounded-full p-0.5 text-base
                ${
                  isActive
                    ? 'text-brand/50 hover:bg-danger hover:text-white!'
                    : 'text-transparent group-hover:text-ink-faint hover:bg-danger hover:text-white!'
                }
              `}
              onClick={(e) => handleTabClose(tab.key, e)}
            />
          )}
        </div>
      </Dropdown>
    );
  };

  return (
    <div className="group/nav relative flex h-full min-w-0 w-full items-center">
      {showScrollLeft && (
        <button
          ref={leftScrollBtnRef}
          type="button"
          onClick={() => scrollTo('left')}
          className="absolute left-0 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-panel text-ink-muted hover:text-ink"
        >
          <HiOutlineChevronLeft className="size-4" />
        </button>
      )}

      <div
        ref={tabsContainerRef}
        onScroll={checkScrollStatus}
        className="flex h-full min-w-0 flex-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full min-w-fit items-center gap-1 pl-1 pr-8">{tabs.map(renderTab)}</div>
      </div>

      {showScrollRight && (
        <button
          ref={rightScrollBtnRef}
          type="button"
          onClick={() => scrollTo('right')}
          className="absolute right-0 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-panel text-ink-muted hover:text-ink"
        >
          <HiOutlineChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
};
