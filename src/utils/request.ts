import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Modal, notification } from 'antd';
import { useUserStore } from '@/stores';

// 配置项目API域名
export const baseURL = 'http://localhost:3000/api';
// export const baseURL = 'https://frame-api.liuyuyang.net/api';

// 创建 axios 实例
export const instance = axios.create({
  // 项目API根路径
  baseURL,
  // 请求超时的时间
  timeout: 10000,
});

// 用于取消请求
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

// 标记是否已经处理过401错误
let isHandling401Error = false;

// 请求拦截
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 获取token
    const token = JSON.parse(localStorage.getItem('user_storage') || '{}')?.state?.token;

    // 如果有token就把赋值给请求头
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    return config;
  },
  (err: AxiosError) => {
    notification.error({
      message: '请求异常',
      description: err.message,
    });

    return Promise.reject(err);
  }
);

// 响应拦截
instance.interceptors.response.use(
  (res: AxiosResponse) => {
    // 如果code为401就证明认证失败
    if (res.data?.code === 401) {
      isHandling401Error = true; // 标记为正在处理401错误

      Modal.error({
        title: '暂无权限',
        content: '🔒️ 登录已过期，请重新登录?',
        okText: '去登录',
        onOk: () => {
          const store = useUserStore.getState();
          store.quitLogin();
          isHandling401Error = false; // 重置标记
        },
      });

      // 取消后续的所有请求
      source.cancel('认证失败，取消所有请求');

      return Promise.reject(res.data);
    }

    // 只要code不等于200, 就相当于响应失败
    if (res.data?.code !== 200) {
      notification.error({
        message: '错误',
        description: res.data?.message || '未知错误',
      });

      return Promise.reject(res.data);
    }

    return res.data;
  },
  (err: AxiosError) => {
    if (isHandling401Error) return;

    notification.error({
      message: '程序异常',
      description: err.message || '未知错误',
    });

    return Promise.reject(err);
  }
);

const request = <T>(method: string, url: string, reqParams?: object) => {
  return instance.request<Response<T>, Response<T>>({
    method,
    url,
    ...reqParams,
    cancelToken: source.token,
  });
};

export default request;
