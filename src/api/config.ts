import request from '@/utils/request';

export interface EnvConfigItem {
  id: number;
  name: string;
  value: Record<string, unknown>;
  notes?: string;
}

export interface BaiduStatisEnvValue {
  site_id: number;
  access_token: string;
}

export interface QiniuStorageEnvValue {
  access_key: string;
  secret_key: string;
  domain: string;
  bucket_name: string;
  zone: string;
}

export const getEnvConfigDataAPI = (name: string) => {
  return request<EnvConfigItem>('GET', `/env_config/name/${name}`);
};

export const getEnvConfigListAPI = () => {
  return request<EnvConfigItem[]>('GET', '/env_config/list');
};

export const updateEnvConfigDataAPI = (data: EnvConfigItem) => {
  return request<string>('PATCH', `/env_config/json/${data.id}`, { data: data.value });
};
