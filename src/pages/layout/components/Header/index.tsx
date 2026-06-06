import { Link } from 'react-router';
import PageTab from './PageTab';
import DarkModeSwitcher from './DarkModeSwitcher';
import LogoSvg from '@/assets/svg/logo.svg';

interface HeaderProps {
  sidebarOpen: boolean | undefined;
  setSidebarOpen: (arg: boolean) => void;
}

export default ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  return (
    <header className="sticky top-0 lg:top-2.5 z-99 flex w-full lg:w-[98%] bg-light-gradient backdrop-blur-xl dark:bg-dark-gradient dark:backdrop-blur-xl lg:ml-[16px] lg:mb-2 lg:rounded-2xl shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.06)] dark:shadow-[0px_30px_30px_-3px_rgba(59,130,246,0.22)] border border-gray-200/50 dark:border-transparent">
      <div className="flex grow items-center justify-between py-1.5 shadow-2 px-3 overflow-scroll">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* 移动端汉堡菜单 */}
          <div className="flex items-center gap-4 lg:hidden shrink-0">
            <button
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              className="z-99999 block rounded-xs border border-stroke bg-white p-1 shadow-xs dark:border-strokedark dark:bg-boxdark lg:hidden"
            >
              <span className="relative block h-6 w-6 cursor-pointer">
                <span className="du-block absolute right-0 h-full w-full">
                  <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-xs bg-black delay-[0] duration-200 ease-in-out dark:bg-white ${!sidebarOpen && 'w-full! delay-300'}`} />
                  <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-xs bg-black delay-150 duration-200 ease-in-out dark:bg-white ${!sidebarOpen && 'delay-400 w-full!'}`} />
                  <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-xs bg-black delay-200 duration-200 ease-in-out dark:bg-white ${!sidebarOpen && 'w-full! delay-500'}`} />
                </span>
                <span className="absolute right-0 h-full w-full rotate-45">
                  <span className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-xs bg-black delay-300 duration-200 ease-in-out dark:bg-white ${!sidebarOpen && 'h-0! delay-[0]!'}`} />
                  <span className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-xs bg-black duration-200 ease-in-out dark:bg-white ${!sidebarOpen && 'h-0! delay-200!'}`} />
                </span>
              </span>
            </button>

            <Link className="block shrink-0 lg:hidden" to="/">
              <img src={LogoSvg} alt="logo" className="w-8" />
            </Link>
          </div>

          {/* 页面标签栏 */}
          <div className="flex-1 min-w-0 w-2/6 overflow-x-auto">
            <PageTab />
          </div>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3 2xsm:gap-7 shrink-0 ml-4">
          <ul className="flex items-center gap-2 2xsm:gap-4 sm:mr-4">
            <DarkModeSwitcher />
          </ul>
        </div>
      </div>
    </header>
  );
};
