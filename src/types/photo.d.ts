// 照片相关类型

import type { Album } from './album';

export interface Photo {
  id: number;
  name: string;
  description?: string;
  url: string;
  original_url?: string;
  size: number;
  width?: number;
  height?: number;
  type: string;
  create_time: string;
  albums?: Album[];
}

export interface CreatePhotoParams {
  name: string;
  description?: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
  type: string;
}

export interface UpdatePhotoParams {
  name?: string;
  description?: string;
}
