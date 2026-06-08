import request from '@/utils/request';
import type {
  Photo,
  CreatePhotoParams,
  UpdatePhotoParams,
  SlimPhotoParams,
  SlimPhotoPreview,
  SlimPhotosSummary,
} from '@/types/photo';

/**
 * 创建照片
 * @param params 照片信息
 * @returns 创建的照片信息
 */
export const createPhotoAPI = (params: CreatePhotoParams) => {
  return request<Photo>('POST', '/photo', {
    data: params,
  });
};

/**
 * 获取照片列表
 * @param params 查询参数（分页、关键词搜索）
 * @returns 分页的照片列表
 */
export const getPhotoListAPI = (params?: FilterParams & { keyword?: string }) => {
  return request<Paginate<Photo[]>>('GET', '/photo/list', {
    params,
  });
};

/**
 * 获取照片详情
 * @param id 照片ID
 * @returns 照片详情
 */
export const getPhotoDetailAPI = (id: number) => {
  return request<Photo>('GET', `/photo/detail/${id}`);
};

/**
 * 更新照片
 * @param id 照片ID
 * @param params 更新参数（名称）
 * @returns 更新结果
 */
export const updatePhotoAPI = (id: number, params: UpdatePhotoParams) => {
  return request<void>('PATCH', `/photo/${id}`, {
    data: params,
  });
};

/**
 * 删除照片，支持批量
 * @param ids 需要删除的照片ID数组
 * @returns 删除结果
 */
export const deletePhotoAPI = (ids: number[]) => {
  return request<void>('DELETE', `/photo`, {
    data: { ids },
  });
};

/**
 * 预览待瘦身照片
 */
export const previewSlimPhotosAPI = (params: SlimPhotoParams) => {
  return request<SlimPhotoPreview>('GET', '/photo/slim/preview', {
    params,
    paramsSerializer: {
      indexes: null,
    },
  });
};

/**
 * 批量瘦身照片（七牛 pfop 持久化处理）
 */
export const slimPhotosAPI = (params: SlimPhotoParams) => {
  return request<SlimPhotosSummary>('POST', '/photo/slim', {
    data: params,
  });
};
