// 足迹相关类型

export interface Footprint {
  id: number;
  title: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  images?: string[];
  create_time: string;
}

export interface CreateFootprintParams {
  title: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  images?: string[];
}

export interface UpdateFootprintParams {
  title?: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  images?: string[];
}

export interface QueryFootprintParams extends FilterParams {
  keyword?: string; // 搜索关键词（标题或地址）
}
