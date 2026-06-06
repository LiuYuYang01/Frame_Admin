import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { FiHome, FiFolder, FiMap, FiUpload, FiSettings } from 'react-icons/fi';
import { useUserStore } from '@/stores';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { BiUser, BiLogOut } from 'react-icons/bi';
import LogoSvg from '@/assets/svg/logo.svg';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

interface MenuItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { path: '/', name: '首页', icon: <FiHome className="text-lg" /> },
  { path: '/albums', name: '相册管理', icon: <FiFolder className="text-lg" /> },
  { path: '/footprint', name: '足迹管理', icon: <FiMap className="text-lg" /> },
  { path: '/upload', name: '上传图片', icon: <FiUpload className="text-lg" /> },
  { path: '/setup', name: '系统配置', icon: <FiSettings className="text-lg" /> },
];

export default ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const { user, quitLogin } = useUserStore();

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  // 点击侧边栏外部时关闭侧边栏
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // 按 ESC 键关闭侧边栏
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // 导航项样式
  const sidebarItemBase =
    'group relative flex items-center gap-1 py-2 px-4 duration-300 ease-in-out hover:bg-[rgba(241,241,244,0.9)] dark:hover:bg-[#313D4A] rounded-md hover:backdrop-blur-[15px] hover:text-primary! dark:hover:text-primary!';
  const sidebarTextIdle = 'text-[#444]! dark:text-slate-200!';
  const sidebarTextActive = 'text-primary! dark:text-primary! dark:bg-[#313D4A]';
  const sidebarItemClass = (active: boolean) =>
    sidebarItemBase + ' ' + (active ? sidebarTextActive : sidebarTextIdle);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // UserCard 下拉菜单
  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <span className="flex items-center gap-2">
          <BiUser className="text-lg" />
          个人中心
        </span>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: (
        <button className="flex items-center gap-2 w-full cursor-pointer" onClick={quitLogin}>
          <BiLogOut className="text-lg" />
          退出登录
        </button>
      ),
    },
  ];

  return (
    <aside
      ref={sidebar}
      className={`absolute z-999 flex h-[calc(100vh-0.9rem)] xs:h-[calc(100vh-1.6rem)] w-56 xs:mt-2.5 xs:ml-2.5 flex-col overflow-y-hidden rounded-2xl duration-300 ease-linear lg:static lg:translate-x-0
        ${sidebarOpen ? 'left-1 top-1.5 xs:left-2 xs:top-2 translate-x-0' : '-left-56 -top-1.5 xs:-left-56 xs:-top-2 -translate-x-full'}
        bg-light-gradient dark:bg-dark-gradient border border-gray-200/50 dark:border-gray-800 transition-all duration-300 backdrop-blur-2xl shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.06)] dark:shadow-[0px_0px_0px_0px_rgba(0,0,0,0)]`}
    >
      {/* Logo 和标题区域 */}
      <div className="flex justify-center items-center gap-2 px-6 py-5 pb-0">
        <NavLink to="/" className="flex items-center font-medium text-[#555]! dark:text-white!">
          <img src={LogoSvg} alt="logo" className="w-8 mr-2.5" />
          <div className="flex flex-col">
            <span>Frame</span>
            <span className="text-[10px] text-gray-500">图片管理系统</span>
          </div>
        </NavLink>

        {/* 移动端侧边栏触发器按钮 */}
        <button ref={trigger} onClick={() => setSidebarOpen(!sidebarOpen)} aria-controls="sidebar" aria-expanded={sidebarOpen} className="block lg:hidden" />
      </div>

      {/* 导航菜单区域 */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear flex-1">
        <nav className="pt-2 pb-4 px-2">
          <ul className="mb-6 flex flex-col gap-1.5">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={sidebarItemClass(isActive(item.path))}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 底部用户信息卡片 */}
      <div className="p-2">
        <Dropdown menu={{ items: dropdownItems }} placement="topRight" trigger={['click']}>
          <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white/60 dark:bg-[#313D4A] backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-[#3d4b5c]">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'avatar'}
                className="w-10 h-10 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg shrink-0">
                {user?.name?.charAt(0) || 'F'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-[#444] dark:text-white">
                {user?.name || user?.username || '未命名'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                管理员
              </div>
            </div>
            <div className="p-2 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10">
              <svg className="shrink-0 w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </div>
          </div>
        </Dropdown>
      </div>
    </aside>
  );
};
