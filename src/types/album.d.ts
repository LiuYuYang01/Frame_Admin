// 相册相关类型

import type { Photo } from './photo';

export interface Album {
  id: number;
  name: string;
  description?: string;
  cover?: string;
  original_cover?: string;
  create_time: string;
  photos?: Photo[];
  photo_count?: number;
}

export interface CreateAlbumParams {
  name: string;
  description?: string;
  cover?: string;
}

export interface UpdateAlbumParams {
  name?: string;
  description?: string;
  cover?: string;
}

export interface QueryAlbumParams extends FilterParams {
  scene?: 'thumb' | 'grid' | 'preview' | 'cover' | 'placeholder';
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'avif';
  keyword?: string;
}

export interface ManagePhotosParams {
  photo_ids: number[];
}
