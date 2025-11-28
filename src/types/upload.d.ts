// 文件上传相关类型

// 普通上传参数
export interface UploadFileParams {
  files: File[];
  albumId: number;
}

// 上传响应
export interface UploadFileResponse {
  id: number;
  name: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
  type: string;
  hash?: string;
  create_time: string;
}

// 秒传检查请求参数
export interface CheckInstantUploadParams {
  hash: string;
  fileSize: number;
}

// 秒传检查响应
export interface CheckInstantUploadResponse {
  id: number;
  name: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
  type: string;
  hash: string;
  create_time: string;
}

// 分片上传请求参数
export interface ChunkUploadParams {
  chunk: Blob;
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileSize: number;
  fileName: string;
  key?: string;
  hash?: string;
  albumId?: number;
}

// 分片上传响应（进行中）
export interface ChunkUploadProgressResponse {
  uploaded: number[];
  completed: false;
}

// 分片上传响应（完成）
export interface ChunkUploadCompleteResponse {
  uploaded: number[];
  completed: true;
  key: string;
  hash: string;
  photo: UploadFileResponse;
}

export type ChunkUploadResponse = ChunkUploadProgressResponse | ChunkUploadCompleteResponse;

// 上传进度查询响应
export interface UploadProgressResponse {
  uploadId: string;
  uploadedChunks: number[];
  progress: number;
}

// 文件上传任务信息
export interface FileUploadTask {
  file: File;
  uploadId: string;
  hash?: string;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'pending' | 'checking' | 'uploading' | 'completed' | 'error' | 'cancelled';
  progress: number;
  result?: UploadFileResponse;
  error?: string;
}
