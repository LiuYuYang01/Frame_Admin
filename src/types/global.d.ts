interface Response<T> {
  code: number;
  message?: string;
  total?: number;
  page?: number;
  page_size?: number;
  data: T;
}

// 分页响应类型
interface Paginate<T> {
  next: boolean;
  prev: boolean;
  page: number;
  size: number;
  pages: number;
  total: number;
  result: T;
}

interface FilterParams {
  page?: number;
  limit?: number;
}
