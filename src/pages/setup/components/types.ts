import type { EnvConfigItem } from '@/api/config';

export interface SetupFormProps {
  row?: EnvConfigItem;
  onSaved: () => void;
}

export type SetupEnvName = 'baidu_statis';

export const SETUP_ENV_NAMES: SetupEnvName[] = ['baidu_statis'];
