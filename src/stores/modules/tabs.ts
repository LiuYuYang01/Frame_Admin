import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabItem {
  key: string;
  title: string;
  path: string;
  closable?: boolean;
}

interface TabsStore {
  tabs: TabItem[];
  activeTabKey: string;
  addTab: (tab: TabItem) => void;
  removeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  clearTabs: () => void;
}

export default create(
  persist<TabsStore>(
    (set, get) => ({
      tabs: [
        {
          key: '/',
          title: '首页',
          path: '/',
          closable: false, // 首页不可关闭
        },
      ],
      activeTabKey: '/',

      addTab: (tab: TabItem) => {
        const { tabs } = get();
        const existingTab = tabs.find((t) => t.key === tab.key);

        if (existingTab) {
          // 如果标签已存在，直接激活它
          set({ activeTabKey: tab.key });
        } else {
          // 添加新标签
          set({
            tabs: [...tabs, tab],
            activeTabKey: tab.key,
          });
        }
      },

      removeTab: (key: string) => {
        const { tabs, activeTabKey } = get();
        const tabIndex = tabs.findIndex((t) => t.key === key);

        if (tabIndex === -1) return;

        const newTabs = tabs.filter((t) => t.key !== key);

        // 如果删除的是当前激活的标签，需要切换到其他标签
        let newActiveKey = activeTabKey;
        if (key === activeTabKey) {
          if (newTabs.length > 0) {
            // 优先选择右边的标签，如果没有则选择左边的
            const nextTab = newTabs[tabIndex] || newTabs[tabIndex - 1];
            newActiveKey = nextTab.key;
          }
        }

        set({
          tabs: newTabs,
          activeTabKey: newActiveKey,
        });
      },

      setActiveTab: (key: string) => {
        set({ activeTabKey: key });
      },

      clearTabs: () => {
        set({
          tabs: [
            {
              key: '/',
              title: '首页',
              path: '/',
              closable: false,
            },
          ],
          activeTabKey: '/',
        });
      },
    }),
    {
      name: 'tabs_storage',
    }
  )
);
