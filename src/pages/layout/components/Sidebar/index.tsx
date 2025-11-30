import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiFolder, FiUpload, FiMenu, FiX } from 'react-icons/fi';
import { Link, useLocation } from 'react-router';
import { BiLeftIndent, BiRightIndent } from 'react-icons/bi';
import LogoSvg from '@/assets/svg/logo.svg';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  { id: 'home', label: '首页', icon: <FiHome />, path: '/' },
  { id: 'albums', label: '相册管理', icon: <FiFolder />, path: '/albums' },
  { id: 'upload', label: '上传图片', icon: <FiUpload />, path: '/upload' },
];

export default () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const sidebarVariants = {
    expanded: { width: '16rem' },
    collapsed: { width: '5rem' },
  };

  const linkVariants = {
    hover: {
      scale: 1.02,
      x: 4,
      transition: { type: 'spring' as const, stiffness: 400, damping: 10 },
    },
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="fixed top-2 left-4 z-50 p-2 rounded-lg border bg-white shadow-lg lg:hidden hover:bg-gray-50 transition-colors cursor-pointer">
        {isMobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* 移动端遮罩层 */}
      {isMobileOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />}

      {/* 侧边栏 */}
      <motion.aside
        initial={false}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed left-0 top-0 h-screen border-r bg-gradient-to-b from-white to-gray-50 
          shadow-xl z-40 flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 transition-transform lg:transition-none
        `}
      >
        {/* Logo 区域 */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 border-b border-gray-200`}>
          <span></span>

          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <img src={LogoSvg} alt="" className="w-10" />
            </motion.div>
          )}

          {/* 折叠按钮 - 仅桌面端显示 */}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:block p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
            {isCollapsed ? <BiRightIndent size={20} /> : <BiLeftIndent size={20} />}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <motion.li key={item.id} variants={linkVariants} whileHover="hover">
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200 group relative overflow-hidden
                      ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-700 hover:bg-gray-100'}
                    `}
                  >
                    {/* 图标 */}
                    <span className={`text-xl ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'}`}>{item.icon}</span>

                    {/* 文字 */}
                    {!isCollapsed && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="font-medium whitespace-nowrap">
                        {item.label}
                      </motion.span>
                    )}

                    {/* 活动指示器 */}
                    {!isCollapsed && isActive && <motion.div layoutId="activeIndicator" className={`absolute right-2 w-2.5 h-2.5 mr-2.5 bg-white rounded-full`} initial={false} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* 底部用户信息 */}
        {/* {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">A</div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">Admin</p>
                <p className="text-xs text-gray-500 truncate">admin@frame.com</p>
              </motion.div>
            </div>
          </div>
        )} */}
      </motion.aside>
    </>
  );
};
