import request from '@/utils/request';
import type { Footprint, CreateFootprintParams, UpdateFootprintParams, QueryFootprintParams } from '@/types/footprint';

/**
 * 创建足迹
 * @param params 足迹信息（标题、内容、地址、位置、图片）
 * @returns 创建的足迹信息
 */
export const createFootprintAPI = (params: CreateFootprintParams) => {
  return request<Footprint>('POST', '/footprint', {
    data: params,
  });
};

/**
 * 获取足迹列表
 * @param params 查询参数（分页、关键词搜索）
 * @returns 分页的足迹列表
 */
export const getFootprintListAPI = (params?: QueryFootprintParams) => {
  return request<Paginate<Footprint[]>>('GET', '/footprint', {
    params,
  });
};

/**
 * 获取足迹详情
 * @param id 足迹ID
 * @returns 足迹详情
 */
export const getFootprintDetailAPI = (id: number) => {
  return request<Footprint>('GET', `/footprint/${id}`);
};

/**
 * 更新足迹
 * @param id 足迹ID
 * @param params 更新参数（标题、内容、地址、位置、图片）
 * @returns 更新结果
 */
export const updateFootprintAPI = (id: number, params: UpdateFootprintParams) => {
  return request<Footprint>('PATCH', `/footprint/${id}`, {
    data: params,
  });
};

/**
 * 删除足迹
 * @param id 足迹ID
 * @returns 删除结果
 */
export const deleteFootprintAPI = (id: number) => {
  return request<void>('DELETE', `/footprint/${id}`);
};
