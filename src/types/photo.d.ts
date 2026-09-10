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
  tags?: string[];
  camera?: string;
  location?: string;
  is_featured?: boolean;
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
  is_featured?: boolean;
  tags?: string[];
  camera?: string;
  location?: string;
}

export interface SlimPhotoParams {
  albumId?: number;
  ids?: number[];
  minSizeBytes?: number;
  maxLongEdge?: number;
  quality?: number;
}

export interface SlimPhotoPreview {
  count: number;
  totalSize: number;
  photoIds: number[];
  items: Array<{
    id: number;
    name: string;
    size: number;
    width?: number;
    height?: number;
  }>;
}

export interface SlimPhotoItemResult {
  id: number;
  name: string;
  status: 'success' | 'skipped' | 'failed';
  beforeSize: number;
  afterSize?: number;
  savedBytes?: number;
  error?: string;
}

export interface SlimPhotosSummary {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  results: SlimPhotoItemResult[];
}

export interface ExtractExifParams {
  albumId?: number;
  ids?: number[];
}

export interface ExtractExifSummary {
  total: number;
  updated: number;
}
