// 足迹相关类型

export interface Footprint {
  id: number;
  title: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  cover?: string;
  album_id?: number;
  album_name?: string; // 列表/详情接口附带
  album_cover?: string; // 列表/详情接口附带
  create_time: string;
}

export interface CreateFootprintParams {
  title: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  cover?: string;
  album_id?: number;
}

export interface UpdateFootprintParams {
  title?: string;
  content?: string;
  address?: string;
  position?: string; // 格式：lng,lat
  cover?: string;
  album_id?: number;
}

export interface QueryFootprintParams extends FilterParams {
  keyword?: string; // 搜索关键词（标题或地址）
}
