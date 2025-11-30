import request from '@/utils/request';
import type { StatisData } from '@/types/statis';

/**
 * 获取统计信息
 * @returns 统计信息（相册数量、照片数量、照片总大小等）
 */
export const getStatisAPI = () => {
  return request<StatisData>('GET', '/statis');
};

