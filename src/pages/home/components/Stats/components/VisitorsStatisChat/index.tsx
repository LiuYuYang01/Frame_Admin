import { useEffect, useState, useMemo } from 'react';
import { Spin } from 'antd';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { getBaiduStatisAPI } from '@/api/statis';
import type { BaiduStatisResult, EChartsParams } from '@/types/baidu_statis';
import { useConfigStore } from '@/stores';

interface Props {
  refreshKey?: number;
}

export default ({ refreshKey = 0 }: Props) => {
  const colorMode = useConfigStore((state) => state.colorMode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BaiduStatisResult | null>(null);
  const [scope, setScope] = useState<'day' | 'month' | 'year'>('day');
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYYMMDD'));
  const endDate = dayjs().format('YYYYMMDD');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await getBaiduStatisAPI('basic-overview', startDate, endDate);
        const response = data as { result?: BaiduStatisResult };
        if (!response?.result) return;
        setResult(response.result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, refreshKey]);

  const scopeData = useMemo(() => {
    if (!result?.items?.length) return { categories: [] as string[], series: [[], []] as number[][] };

    let categories: string[] = [];
    let pvList: number[] = [];
    let ipList: number[] = [];

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    switch (scope) {
      case 'day': {
        const today = now.date();
        categories = Array.from({ length: today }, (_, i) => `${currentMonth}/${(i + 1).toString().padStart(2, '0')}`);
        const dateArr = result.items[0];
        const valueArr = result.items[1];
        const dayMap: Record<string, { pv: number; ip: number }> = {};
        dateArr.forEach((dateArray, idx) => {
          const date = dateArray[0];
          const d = dayjs(date, 'YYYY/MM/DD');
          if (d.year() === currentYear && d.month() + 1 === currentMonth) {
            const key = `${currentMonth}/${d.date().toString().padStart(2, '0')}`;
            const pair = valueArr[idx];
            dayMap[key] = {
              pv: Number(pair[0]) || 0,
              ip: Number(pair[1]) || 0,
            };
          }
        });
        pvList = categories.map((day) => dayMap[day]?.pv || 0);
        ipList = categories.map((day) => dayMap[day]?.ip || 0);
        break;
      }
      case 'month': {
        categories = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
        const dateArr = result.items[0];
        const valueArr = result.items[1];
        const monthMap: Record<string, { pv: number; ip: number }> = {};
        dateArr.forEach((dateArray, idx) => {
          const date = dateArray[0];
          const d = dayjs(date, 'YYYY/MM/DD');
          if (d.year() === currentYear) {
            const m = (d.month() + 1).toString().padStart(2, '0');
            if (!monthMap[m]) monthMap[m] = { pv: 0, ip: 0 };
            const pair = valueArr[idx];
            monthMap[m].pv += Number(pair[0]) || 0;
            monthMap[m].ip += Number(pair[1]) || 0;
          }
        });
        pvList = categories.map((m) => monthMap[m]?.pv || 0);
        ipList = categories.map((m) => monthMap[m]?.ip || 0);
        break;
      }
      case 'year': {
        const dateArr = result.items[0];
        const valueArr = result.items[1];
        const yearMap: Record<string, { pv: number; ip: number }> = {};
        dateArr.forEach((dateArray, idx) => {
          const date = dateArray[0];
          const d = dayjs(date, 'YYYY/MM/DD');
          const y = d.year().toString();
          if (!yearMap[y]) yearMap[y] = { pv: 0, ip: 0 };
          const pair = valueArr[idx];
          yearMap[y].pv += Number(pair[0]) || 0;
          yearMap[y].ip += Number(pair[1]) || 0;
        });
        categories = Object.keys(yearMap).sort();
        pvList = categories.map((y) => yearMap[y]?.pv || 0);
        ipList = categories.map((y) => yearMap[y]?.ip || 0);
        break;
      }
    }

    return { categories, series: [pvList, ipList] };
  }, [result, scope]);

  const handleScopeChange = (newScope: 'day' | 'month' | 'year') => {
    setScope(newScope);
    const now = dayjs();
    switch (newScope) {
      case 'day':
        setStartDate(now.startOf('month').format('YYYYMMDD'));
        break;
      case 'month':
        setStartDate(now.startOf('year').format('YYYYMMDD'));
        break;
      case 'year':
        setStartDate(dayjs(`${now.year() - 4}-01-01`).format('YYYYMMDD'));
        break;
    }
  };

  return (
    <div className="col-span-12 rounded-xl border border-stroke px-5 pt-7 pb-5 shadow-default dark:border-transparent bg-light-gradient dark:bg-dark-gradient sm:px-7 xl:col-span-8">
      <div className="flex w-full justify-between items-center mb-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">访客统计</h3>

        <div className="inline-flex items-center rounded-md bg-whiter p-1.5 space-x-1">
          {(['day', 'month', 'year'] as const).map((item) => (
            <button
              key={item}
              className={`rounded-sm py-1 px-3 text-xs font-medium text-black hover:bg-white hover:shadow-card dark:text-white dark:hover:bg-boxdark cursor-pointer ${scope === item ? 'bg-white dark:bg-[#4e5969]! shadow-card' : ''}`}
              onClick={() => handleScopeChange(item)}
            >
              {item === 'day' ? '天' : item === 'month' ? '月' : '年'}
            </button>
          ))}
        </div>
      </div>

      <Spin spinning={loading}>
        <div id="chartOne" className="-ml-5">
          <ReactECharts
            option={{
              tooltip: {
                trigger: 'axis',
                backgroundColor: colorMode === 'dark' ? '#334459' : '#fff',
                borderColor: colorMode === 'dark' ? '#475f7d' : '#e5eaf3',
                borderWidth: 1,
                textStyle: {
                  color: colorMode === 'dark' ? '#e0e0e0' : '#1a2757',
                  fontSize: 14,
                },
                padding: 16,
                extraCssText:
                  colorMode === 'dark'
                    ? 'box-shadow: 0 4px 24px rgba(0,0,0,0.3); border-radius: 10px;'
                    : 'box-shadow: 0 4px 24px rgba(0,0,0,0.08); border-radius: 10px;',
                formatter: function (params: EChartsParams[]) {
                  let str = `<div style="font-weight:700;margin-bottom:8px;">${params[0].axisValue}${scope === 'month' ? '月' : scope === 'year' ? '年' : ''}</div>`;
                  params.forEach((item: EChartsParams) => {
                    const color = item.seriesName === '访客' ? '#6a8eff' : '#4fc3ff';
                    str += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                      <span style="display:inline-flex;align-items:center;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;"></span>
                        ${item.seriesName}：
                      </span>
                      <span style="font-weight:700;margin-left:16px;">${item.data}</span>
                    </div>`;
                  });
                  return str;
                },
              },
              legend: {
                data: [
                  { name: '访客', icon: 'circle', itemStyle: { color: '#6a8eff' } },
                  { name: 'IP', icon: 'circle', itemStyle: { color: '#4fc3ff' } },
                ],
                bottom: 0,
                left: 'center',
                itemWidth: 18,
                itemHeight: 18,
                itemGap: 32,
                textStyle: {
                  fontSize: 14,
                  color: colorMode === 'dark' ? '#e0e0e0' : '#1a2757',
                },
              },
              grid: { left: 50, right: 20, top: 20, bottom: 60 },
              xAxis: {
                type: 'category',
                boundaryGap: false,
                data: scopeData.categories,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                  fontSize: 12,
                  color: colorMode === 'dark' ? '#475f7d' : '#1a2757',
                },
              },
              yAxis: {
                type: 'value',
                min: 0,
                splitNumber: 5,
                axisLine: { show: false },
                axisLabel: {
                  fontSize: 12,
                  color: colorMode === 'dark' ? '#475f7d' : '#1a2757',
                },
                splitLine: {
                  lineStyle: {
                    type: 'dashed',
                    color: colorMode === 'dark' ? '#475f7d' : '#f0f4fa',
                  },
                },
              },
              series: [
                {
                  name: '访客',
                  type: 'line',
                  smooth: false,
                  symbol: 'circle',
                  symbolSize: 8,
                  itemStyle: { color: '#fff', borderColor: '#6a8eff', borderWidth: 3 },
                  lineStyle: { width: 3, color: '#6a8eff' },
                  areaStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(106,142,255,0.25)' },
                        { offset: 1, color: 'rgba(106,142,255,0)' },
                      ],
                    },
                  },
                  data: scopeData.series[0],
                },
                {
                  name: 'IP',
                  type: 'line',
                  smooth: false,
                  symbol: 'circle',
                  symbolSize: 8,
                  itemStyle: { color: '#fff', borderColor: '#4fc3ff', borderWidth: 3 },
                  lineStyle: { width: 3, color: '#4fc3ff' },
                  areaStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(79,195,255,0.18)' },
                        { offset: 1, color: 'rgba(79,195,255,0)' },
                      ],
                    },
                  },
                  data: scopeData.series[1],
                },
              ],
            }}
            style={{ height: 400, width: '100%' }}
          />
        </div>
      </Spin>
    </div>
  );
};
