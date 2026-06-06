// 用户相关类型

export interface LoginParams {
  username: string;
  password: string;
}

export interface UserInfo {
  id: number;
  name: string;
  username: string;
  avatar: string;
  create_time?: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UpdateProfileParams {
  username?: string;
  name?: string;
  old_password?: string;
  new_password?: string;
}

