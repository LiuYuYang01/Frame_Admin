import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { AiOutlineEye, AiOutlineMeh, AiOutlineStock, AiOutlineFieldTime } from 'react-icons/ai';
import dayjs from 'dayjs';
import CardDataStats from '@/components/CardDataStats';
import VisitorsStatisChat from './components/VisitorsStatisChat';
import NewOldVisitors from './components/NewOldVisitors';
import { getBaiduStatisAPI } from '@/api/statis';
import type { BaiduStatisResult } from '@/types/baidu_statis';

interface Props {
  refreshKey?: number;
}

export default ({ refreshKey = 0 }: Props) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pv: 0,
    ip: 0,
    bounce: 0,
    avgTime: '00:00:00',
  });

  const formatTime = (seconds: number) => {
    const roundedSeconds = Math.round(seconds);
    const h = Math.floor(roundedSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((roundedSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (roundedSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const getDataList = async () => {
      try {
        setLoading(true);
        const date = dayjs().format('YYYYMMDD');
        const { data } = await getBaiduStatisAPI('overview', date, date);
        const response = data as { result?: BaiduStatisResult };
        if (!response?.result) return;

        const { result } = response;
        let pv = 0;
        let ip = 0;
        let bounce = 0;
        let avgTime = 0;
        let count = 0;

        result.items[1].forEach((item) => {
          if (!Number(item[0])) return;
          if (!isNaN(Number(item[0]))) pv += Number(item[0]);
          if (!isNaN(Number(item[1]))) ip += Number(item[1]);
          if (!isNaN(Number(item[2]))) bounce += Number(item[2]);
          if (!isNaN(Number(item[3]))) avgTime += Number(item[3]);
          if (!isNaN(Number(item[2])) && !isNaN(Number(item[3]))) count++;
        });

        setStats({
          pv,
          ip,
          bounce: count !== 0 ? bounce / count : 0,
          avgTime: count !== 0 ? formatTime(avgTime / count) : '00:00:00',
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    getDataList();
  }, [refreshKey]);

  return (
    <Spin spinning={loading}>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <CardDataStats title="今日浏览量" total={String(stats.pv)}>
          <AiOutlineEye className="fill-primary dark:fill-white text-2xl" />
        </CardDataStats>
        <CardDataStats title="今日访客" total={String(stats.ip)}>
          <AiOutlineMeh className="fill-primary dark:fill-white text-2xl" />
        </CardDataStats>
        <CardDataStats title="跳出率" total={`${stats.bounce.toFixed(2)}%`}>
          <AiOutlineStock className="fill-primary dark:fill-white text-2xl" />
        </CardDataStats>
        <CardDataStats title="平均访问时长" total={stats.avgTime}>
          <AiOutlineFieldTime className="fill-primary dark:fill-white text-2xl" />
        </CardDataStats>
      </div>

      <div className="rounded-xl mt-2 grid grid-cols-12 gap-2 mb-[15px]">
        <VisitorsStatisChat refreshKey={refreshKey} />
        <NewOldVisitors refreshKey={refreshKey} />
      </div>
    </Spin>
  );
};
