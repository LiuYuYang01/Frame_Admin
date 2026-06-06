import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AiOutlineFolderOpen, AiOutlinePicture, AiOutlineCloudServer, AiOutlineUpload, AiOutlineArrowRight } from 'react-icons/ai';
import { DoubleRightOutlined } from '@ant-design/icons';
import { getStatisAPI } from '@/api/statis';
import type { StatisData } from '@/types/statis';
import { useUserStore } from '@/stores';

export default () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [stats, setStats] = useState<StatisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await getStatisAPI();
        setStats(data);
      } catch (error) {
        console.error('加载统计数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const quickActions = [
    {
      title: '上传照片',
      description: '将照片上传到相册',
      icon: <AiOutlineUpload className="text-2xl" />,
      path: '/upload',
      color: '#3b82f6',
      bgColor: 'bg-[#e7f2fe] dark:bg-[#4e5969]',
    },
    {
      title: '管理相册',
      description: '创建和管理相册',
      icon: <AiOutlineFolderOpen className="text-2xl" />,
      path: '/albums',
      color: '#22c55e',
      bgColor: 'bg-[#e7f8ee] dark:bg-[#4e5969]',
    },
    {
      title: '查看足迹',
      description: '浏览和管理足迹',
      icon: <AiOutlinePicture className="text-2xl" />,
      path: '/footprint',
      color: '#a855f7',
      bgColor: 'bg-[#f3e8ff] dark:bg-[#4e5969]',
    },
  ];

  return (
    <div>
      {/* 欢迎横幅 */}
      <div className="bg-primary rounded-xl p-6 sm:p-10 flex flex-col justify-center h-[170px] relative overflow-hidden mb-3">
        <div
          className="absolute right-[-60px] top-[-40px] w-[300px] h-[300px] bg-blue-300 opacity-40 z-0"
          style={{
            borderRadius: '60% 40% 60% 40% / 60% 60% 40% 40%',
          }}
        />

        <div className="relative z-10">
          <h1 className="text-white text-xl font-bold sm:text-2xl mb-4">
            欢迎使用 Frame 图片管理系统
          </h1>

          <button
            className="bg-white text-blue-400 font-bold py-1 px-4 rounded-sm transition-transform hover:scale-105 cursor-pointer flex items-center gap-1"
            onClick={() => navigate('/upload')}
          >
            去上传 <DoubleRightOutlined />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-4">
        <div className="rounded-xl border border-stroke py-6 px-7 shadow-default dark:border-transparent bg-light-gradient dark:bg-dark-gradient">
          <h3 className="text-sm text-slate-700 dark:text-white">相册总数</h3>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-2xl my-2 text-black dark:text-white">
              {loading ? '-' : stats?.album.count || 0}
            </h4>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e7f2fe] dark:bg-[#4e5969]">
              <AiOutlineFolderOpen className="text-xl text-blue-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stroke py-6 px-7 shadow-default dark:border-transparent bg-light-gradient dark:bg-dark-gradient">
          <h3 className="text-sm text-slate-700 dark:text-white">照片总数</h3>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-2xl my-2 text-black dark:text-white">
              {loading ? '-' : stats?.photo.count || 0}
            </h4>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e7f8ee] dark:bg-[#4e5969]">
              <AiOutlinePicture className="text-xl text-green-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stroke py-6 px-7 shadow-default dark:border-transparent bg-light-gradient dark:bg-dark-gradient">
          <h3 className="text-sm text-slate-700 dark:text-white">照片总大小</h3>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-2xl my-2 text-black dark:text-white">
              {loading ? '-' : stats?.photo.totalSizeFormatted || '0 B'}
            </h4>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f3e8ff] dark:bg-[#4e5969]">
              <AiOutlineCloudServer className="text-xl text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="px-3 mb-4">
        <div className="overflow-auto flex justify-between items-center">
          <h2 className="font-semibold text-black dark:text-white text-xl min-w-24">快捷操作</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => (
          <div
            key={action.path}
            onClick={() => navigate(action.path)}
            className="rounded-xl border border-stroke py-6 px-7 shadow-default dark:border-transparent bg-light-gradient dark:bg-dark-gradient cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-md ${action.bgColor}`}
                style={{ color: action.color }}
              >
                {action.icon}
              </div>
              <div>
                <h3 className="font-semibold text-black dark:text-white">{action.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
              <span>前往</span>
              <AiOutlineArrowRight />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
