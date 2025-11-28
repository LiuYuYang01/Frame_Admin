import request from '@/utils/request';
import type { UploadFileParams, UploadFileResponse, CheckInstantUploadParams, CheckInstantUploadResponse, ChunkUploadParams, ChunkUploadResponse, UploadProgressResponse } from '@/types/upload';

/**
 * 文件上传（支持批量上传）
 * @param params 上传参数（文件数组和相册ID）
 * @returns 上传成功的照片信息数组
 */
export const uploadFileAPI = (params: UploadFileParams) => {
  const formData = new FormData();

  // 添加文件
  params.files.forEach((file) => {
    formData.append('files', file);
  });

  // 添加相册ID
  formData.append('albumId', params.albumId.toString());

  return request<UploadFileResponse[]>('POST', '/qiniu/upload', {
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 0,
  });
};

/**
 * 分片上传
 * @param params 分片上传参数
 * @returns 上传进度或完成信息
 */
export const chunkUploadAPI = (params: ChunkUploadParams) => {
  const formData = new FormData();
  formData.append('chunk', params.chunk);
  formData.append('uploadId', params.uploadId);
  formData.append('chunkIndex', params.chunkIndex.toString());
  formData.append('totalChunks', params.totalChunks.toString());
  formData.append('fileSize', params.fileSize.toString());
  formData.append('fileName', params.fileName);

  if (params.key) {
    formData.append('key', params.key);
  }
  if (params.hash) {
    formData.append('hash', params.hash);
  }
  if (params.albumId) {
    formData.append('albumId', params.albumId.toString());
  }

  return request<ChunkUploadResponse>('POST', '/qiniu/chunk_upload', {
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 0,
  });
};

/**
 * 获取上传进度
 * @param uploadId 上传ID
 * @returns 上传进度信息
 */
export const getUploadProgressAPI = (uploadId: string) => {
  return request<UploadProgressResponse>('GET', `/qiniu/upload-progress?uploadId=${uploadId}`);
};

/**
 * 取消上传
 * @param uploadId 上传ID
 */
export const cancelUploadAPI = (uploadId: string) => {
  return request<null>('DELETE', `/qiniu/cancel_upload?uploadId=${uploadId}`);
};
