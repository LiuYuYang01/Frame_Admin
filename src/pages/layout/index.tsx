import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useConfigStore } from '@/stores';

export default () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const colorMode = useConfigStore((state) => state.colorMode);

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;

    if (colorMode === 'dark') {
      bodyClass.add(className);
    } else {
      bodyClass.remove(className);
    }
  }, [colorMode]);

  return (
    <div className="dark:bg-[#1A222C] dark:text-[#AEB7C0]">
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 w-full max-w-full flex-1 flex-col p-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
