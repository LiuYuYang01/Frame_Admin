// 文件上传相关类型

export interface UploadFileParams {
  files: File[];
  albumId: number;
}

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

export interface PreUploadParams {
  hash: string;
  fileName: string;
  size: number;
  type: string;
  albumId: number;
  width?: number;
  height?: number;
}

export interface PreUploadInstantResponse {
  instant: true;
  photo: UploadFileResponse;
}

export interface PreUploadCredentialsResponse {
  instant: false;
  uploadToken: string;
  key: string;
  uploadUrl: string;
}

export interface ConfirmUploadParams {
  hash: string;
  key: string;
  fileName: string;
  size: number;
  type: string;
  albumId: number;
  width?: number;
  height?: number;
}

export interface PreparedUploadFile {
  file: File;
  width: number;
  height: number;
}

// 文件上传任务信息
export interface FileUploadTask {
  file: File;
  uploadId: string;
  hash?: string;
  status: 'pending' | 'checking' | 'uploading' | 'completed' | 'error' | 'cancelled';
  progress: number;
  result?: UploadFileResponse;
  error?: string;
}
