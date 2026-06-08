import request from '@/utils/request';
import type {
  UploadFileParams,
  UploadFileResponse,
  PreUploadParams,
  PreUploadInstantResponse,
  PreUploadCredentialsResponse,
  ConfirmUploadParams,
} from '@/types/upload';

/**
 * 直传预检：秒传或获取七牛上传凭证
 */
export const preUploadAPI = (params: PreUploadParams) => {
  return request<PreUploadInstantResponse | PreUploadCredentialsResponse>('POST', '/qiniu/pre-upload', {
    data: params,
  });
};

/**
 * 直传确认：七牛上传完成后写入数据库
 */
export const confirmUploadAPI = (params: ConfirmUploadParams) => {
  return request<UploadFileResponse>('POST', '/qiniu/confirm', {
    data: params,
  });
};

/**
 * 文件上传（经 API 中转，保留兼容）
 * @deprecated 请使用直传流程 preUploadAPI + uploadToQiniu + confirmUploadAPI
 */
export const uploadFileAPI = (params: UploadFileParams) => {
  const formData = new FormData();

  params.files.forEach((file) => {
    formData.append('files', file);
  });

  formData.append('albumId', params.albumId.toString());

  return request<UploadFileResponse[]>('POST', '/qiniu/upload', {
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 0,
  });
};
