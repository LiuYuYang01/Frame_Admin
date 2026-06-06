import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BiBarChart, BiCloudUpload } from 'react-icons/bi';
import { Card, Spin } from 'antd';
import { getEnvConfigListAPI, type EnvConfigItem } from '@/api/config';
import { BaiduForm, QiniuForm } from './components';
import { SETUP_ENV_NAMES, type SetupEnvName } from './components/types';

interface MenuItem {
  key: SetupEnvName;
  title: string;
  icon: React.ReactNode;
}

const MENU_LIST: MenuItem[] = [
  {
    key: 'baidu_statis',
    title: '百度统计',
    icon: <BiBarChart />,
  },
  {
    key: 'qiniu_storage',
    title: '七牛云存储',
    icon: <BiCloudUpload />,
  },
];

function useSetupConfigs() {
  const [byName, setByName] = useState<Partial<Record<SetupEnvName, EnvConfigItem>>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: list } = await getEnvConfigListAPI();
      const next: Partial<Record<SetupEnvName, EnvConfigItem>> = {};
      for (const row of list) {
        if (SETUP_ENV_NAMES.includes(row.name as SetupEnvName)) {
          next[row.name as SetupEnvName] = row;
        }
      }
      setByName(next);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { byName, loading, reload: load };
}

export default function SetupPage() {
  const [params, setParams] = useSearchParams();
  const tabFromUrl = params.get('tab') as SetupEnvName | null;
  const activeKey = tabFromUrl && SETUP_ENV_NAMES.includes(tabFromUrl) ? tabFromUrl : 'baidu_statis';

  const { byName, loading, reload } = useSetupConfigs();

  const handleMenuClick = (key: SetupEnvName) => {
    setParams({ tab: key });
  };

  useEffect(() => {
    if (!tabFromUrl || !SETUP_ENV_NAMES.includes(tabFromUrl)) {
      setParams({ tab: activeKey }, { replace: true });
    }
  }, [tabFromUrl, activeKey, setParams]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold">系统配置</span>
        </div>
      }
      className="[&_.ant-card-body]:min-h-[calc(100vh-180px)] [&_.ant-card-body]:p-0"
    >
      <div className="flex min-h-[calc(100vh-180px)] flex-col lg:flex-row">
        <div className="shrink-0 border-b border-gray-100 dark:border-strokedark lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-0.5 p-2 mr-4">
            {MENU_LIST.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMenuClick(item.key)}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-primary/8 dark:bg-primary/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    } cursor-pointer`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
                  )}

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-400 dark:bg-white/8 dark:text-gray-500 group-hover:text-gray-600'
                      }`}
                  >
                    <span className="text-[15px]">{item.icon}</span>
                  </div>

                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span
                      className={`truncate text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  {isActive && (
                    <div className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeKey === 'baidu_statis' && <BaiduForm row={byName[activeKey]} onSaved={reload} />}
          {activeKey === 'qiniu_storage' && <QiniuForm row={byName[activeKey]} onSaved={reload} />}
        </div>
      </div>
    </Card>
  );
}
