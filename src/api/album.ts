import request from '@/utils/request';
import type { Album, CreateAlbumParams, UpdateAlbumParams, QueryAlbumParams, ManagePhotosParams } from '@/types/album';
import type { Photo } from '@/types/photo';

/**
 * 创建相册
 * @param params 相册信息（名称、描述、封面）
 * @returns 创建的相册信息
 */
export const createAlbumAPI = (params: CreateAlbumParams) => {
  return request<Album>('POST', '/album', {
    data: params,
  });
};

/**
 * 获取相册列表
 * @param params 查询参数（分页、关键词搜索）
 * @returns 分页的相册列表
 */
export const getAlbumListAPI = (params?: QueryAlbumParams) => {
  return request<Paginate<Album[]>>('GET', '/album/list', {
    params,
  });
};

/**
 * 获取相册详情
 * @param id 相册ID
 * @returns 相册详情（包含照片数量）
 */
export const getAlbumDetailAPI = (id: number) => {
  return request<Album>('GET', `/album/detail/${id}`);
};

/**
 * 更新相册
 * @param id 相册ID
 * @param params 更新参数（名称、描述、封面）
 * @returns 更新结果
 */
export const updateAlbumAPI = (id: number, params: UpdateAlbumParams) => {
  return request<void>('PATCH', `/album/${id}`, {
    data: params,
  });
};

/**
 * 删除相册
 * @param id 相册ID
 * @returns 删除结果
 */
export const deleteAlbumAPI = (id: number) => {
  return request<void>('DELETE', `/album/${id}`);
};

/**
 * 绑定照片到相册
 * @param id 相册ID
 * @param params 照片ID数组
 * @returns 添加结果
 */
export const addPhotosToAlbumAPI = (id: number, params: ManagePhotosParams) => {
  return request<void>('POST', `/album/${id}/photos`, {
    data: params,
  });
};

/**
 * 从相册移除照片
 * @param id 相册ID
 * @param params 照片ID数组
 * @returns 移除结果
 */
export const removePhotosFromAlbumAPI = (id: number, params: ManagePhotosParams) => {
  return request<void>('DELETE', `/album/${id}/photos`, {
    data: params,
  });
};

/**
 * 分页查询相册中的照片
 * @param id 相册ID
 * @param params 分页参数
 * @returns 分页的照片列表
 */
export const getAlbumPhotosAPI = (id: number, params?: QueryAlbumParams) => {
  return request<Paginate<Photo[]>>('GET', `/album/${id}/photos`, {
    params,
  });
};

/**
 * 查询未加入当前相册的照片（分页）
 * @param id 相册ID
 * @param params 分页参数，如 { page, limit }
 * @returns 分页的照片列表，排除已在相册内的照片
 */
export const getPhotosExcludeFromAlbumAPI = (id: number, params?: QueryAlbumParams) => {
  return request<Paginate<Photo[]>>('GET', `/album/${id}/photos/exclude`, {
    params,
  });
};
