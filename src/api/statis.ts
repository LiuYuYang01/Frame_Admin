import request from '@/utils/request';
import type { StatisData } from '@/types/statis';

export type BaiduStatisType = 'overview' | 'new-visitor' | 'basic-overview';

/**
 * 获取系统统计信息（相册、照片等）
 */
export const getStatisAPI = () => {
  return request<StatisData>('GET', '/statis');
};

/**
 * 获取百度统计数据
 */
export const getBaiduStatisAPI = (type: BaiduStatisType, startDate: string, endDate: string) => {
  return request<Record<string, unknown>>('GET', '/statis/baidu', {
    params: { type, startDate, endDate },
  });
};
