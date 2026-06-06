import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { DoubleRightOutlined } from '@ant-design/icons';
import { getStatisAPI } from '@/api/statis';

export default function InfoCard() {
  const navigate = useNavigate();
  const [albumCount, setAlbumCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [photoSize, setPhotoSize] = useState('0 B');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await getStatisAPI();
        setAlbumCount(data.album.count);
        setPhotoCount(data.photo.count);
        setPhotoSize(data.photo.totalSizeFormatted);
      } catch (error) {
        console.error('加载统计数据失败', error);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="bg-primary rounded-xl p-6 sm:p-10 flex flex-col justify-center h-[170px] relative overflow-hidden mb-3">
      <div
        className="absolute right-[-60px] top-[-40px] w-[300px] h-[300px] bg-blue-300 opacity-40 z-0"
        style={{
          borderRadius: '60% 40% 60% 40% / 60% 60% 40% 40%',
        }}
      />

      <div className="relative z-10">
        <h1 className="text-white text-xl font-bold sm:text-2xl">欢迎使用 Frame 图片管理系统</h1>

        <p className="text-white text-sm mt-2 mb-3">
          当前共有 <span className="text-white text-2xl font-bold">{albumCount}</span> 个相册，
          <span className="text-white text-2xl font-bold">{photoCount}</span> 张照片，总大小{' '}
          <span className="text-white text-2xl font-bold">{photoSize}</span>。
        </p>

        <button
          className="bg-white text-blue-400 font-bold py-1 px-4 rounded-sm transition-transform hover:scale-105 cursor-pointer flex items-center gap-1"
          onClick={() => navigate('/upload')}
        >
          去上传 <DoubleRightOutlined />
        </button>
      </div>
    </div>
  );
}
