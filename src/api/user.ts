import request from '@/utils/request';
import type { LoginParams, LoginResponse, UpdateProfileParams, UserInfo } from '@/types/user';

/**
 * 管理员登录
 * @param params 登录参数
 * @returns 登录响应（包含 token 和用户信息）
 */
export const loginAPI = (params: LoginParams) => {
  return request<LoginResponse>('POST', '/user/login', {
    data: params,
  });
};

/**
 * 更新个人资料
 */
export const updateProfileAPI = (params: UpdateProfileParams) => {
  return request<UserInfo>('PATCH', '/user/profile', {
    data: params,
  });
};
