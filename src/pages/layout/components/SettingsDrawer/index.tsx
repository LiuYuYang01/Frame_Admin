import type { CSSProperties } from 'react';
import { Drawer } from 'antd';
import { FiCheck } from 'react-icons/fi';
import { useConfigStore, themePresets, type SidebarStyle, type ColorMode } from '@/stores';

const colorModeOptions: { key: ColorMode; label: string }[] = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
];

const sidebarOptions: { key: SidebarStyle; label: string }[] = [
  { key: 'dark', label: '墨蓝' },
  { key: 'light', label: '浅色' },
];

export default ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const colorMode = useConfigStore((s) => s.colorMode);
  const setColorMode = useConfigStore((s) => s.setColorMode);
  const sidebarStyle = useConfigStore((s) => s.sidebarStyle);
  const setSidebarStyle = useConfigStore((s) => s.setSidebarStyle);
  const primaryColor = useConfigStore((s) => s.primaryColor);
  const setPrimaryColor = useConfigStore((s) => s.setPrimaryColor);

  return (
    <Drawer title="设置中心" placement="right" width={320} open={open} onClose={onClose}>
      <div className="text-[13px] font-semibold text-ink">个性化配置</div>
      <div className="mt-1 text-xs text-ink-faint">立即生效，并自动保存到本地</div>

      <div className="mt-5 text-[13px] font-medium text-ink-muted">外观模式</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {colorModeOptions.map((opt) => {
          const selected = colorMode === opt.key;
          const isDarkPreview = opt.key === 'dark';
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setColorMode(opt.key)}
              className={`relative cursor-pointer rounded-lg border p-2 text-left ${
                selected ? 'border-brand' : 'border-line hover:border-ink-faint'
              }`}
            >
              {/* 预览卡片使用固定色值，不随当前主题变化，确保亮/暗预览始终还原真实外观 */}
              <div
                className={`flex h-14 overflow-hidden rounded-md border ${
                  isDarkPreview ? 'border-white/10 bg-[#0b0f14]' : 'border-[#e4e7ec] bg-[#f5f6f8]'
                }`}
              >
                <div className={`w-1/3 ${isDarkPreview ? 'bg-[#0e1626]' : 'border-r border-[#e4e7ec] bg-[#f8f9fb]'}`}>
                  <div className={`m-1.5 h-1.5 w-4 rounded-sm ${isDarkPreview ? 'bg-white/20' : 'bg-[#e4e7ec]'}`} />
                </div>
                <div className={`flex-1 ${isDarkPreview ? 'bg-[#151b26]' : 'bg-white'}`}>
                  <div
                    className={`m-1.5 h-2.5 rounded-sm ${isDarkPreview ? 'bg-[#1a2332]' : 'bg-[#ebedf0]'}`}
                  />
                  <div className={`mx-1.5 h-2 rounded-sm ${isDarkPreview ? 'bg-[#121820]' : 'bg-[#e4e7ec]/60'}`} />
                </div>
              </div>
              <div className="mt-2 text-xs font-medium text-ink">{opt.label}</div>
              {selected && (
                <span className="absolute right-2 top-2 flex size-4.5 items-center justify-center rounded-full bg-brand text-white">
                  <FiCheck className="text-[10px]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-[13px] font-medium text-ink-muted">侧边栏样式</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {sidebarOptions.map((opt) => {
          const selected = sidebarStyle === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSidebarStyle(opt.key)}
              className={`relative cursor-pointer rounded-lg border p-2 text-left ${
                selected ? 'border-brand' : 'border-line hover:border-ink-faint'
              }`}
            >
              {/* 侧边栏部分用固定色值，内容区跟随当前主题 */}
              <div className="flex h-14 overflow-hidden rounded-md border border-line">
                <div className={`w-1/3 ${opt.key === 'dark' ? 'bg-[#0e1626]' : 'border-r border-[#e4e7ec] bg-white'}`}>
                  <div className={`m-1.5 h-1.5 w-4 rounded-sm ${opt.key === 'dark' ? 'bg-white/20' : 'bg-[#e4e7ec]'}`} />
                  <div
                    className={`mx-1.5 h-1.5 w-4 rounded-sm ${
                      opt.key === 'dark' ? 'bg-rail-ink-selected' : 'bg-[#e6f4ff]'
                    }`}
                  />
                </div>
                <div className="flex-1 bg-canvas">
                  <div className="m-1.5 h-2.5 rounded-sm bg-panel" />
                  <div className="mx-1.5 h-2 rounded-sm bg-canvas-deep" />
                </div>
              </div>
              <div className="mt-2 text-xs font-medium text-ink">{opt.label}</div>
              {selected && (
                <span className="absolute right-2 top-2 flex size-4.5 items-center justify-center rounded-full bg-brand text-white">
                  <FiCheck className="text-[10px]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-[13px] font-medium text-ink-muted">主题色</div>
      <div className="mt-2 flex gap-3">
        {themePresets.map((p) => {
          const selected = primaryColor === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPrimaryColor(p.key)}
              className="flex cursor-pointer flex-col items-center gap-1.5"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full ${
                  selected ? 'ring-2 ring-offset-2 ring-offset-elevated' : ''
                }`}
                style={
                  {
                    backgroundColor: p.primary,
                    '--tw-ring-color': p.primary,
                  } as CSSProperties
                }
              >
                {selected && <FiCheck className="text-sm text-white" />}
              </span>
              <span className={`text-[11px] ${selected ? 'font-medium text-ink' : 'text-ink-muted'}`}>{p.label}</span>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
};
