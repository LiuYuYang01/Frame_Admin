import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SidebarStyle = 'dark' | 'light';

export type ColorMode = 'light' | 'dark';

export interface ThemePreset {
  key: string;
  primary: string;
  hover: string;
  accent: string;
  label: string;
}

export const themePresets: ThemePreset[] = [
  { key: 'classic', primary: '#539dfd', hover: '#3d86ef', accent: '#7db7fe', label: '经典蓝' },
  { key: 'cobalt', primary: '#3B5BDB', hover: '#3248B8', accent: '#6E85F5', label: '钴蓝' },
  { key: 'emerald', primary: '#0E9F6E', hover: '#0A7A55', accent: '#2FBF8F', label: '翡翠' },
  { key: 'violet', primary: '#7048E8', hover: '#5A38C4', accent: '#9B7BF0', label: '紫罗兰' },
  { key: 'crimson', primary: '#D6455D', hover: '#B03549', accent: '#EA7A8B', label: '绯红' },
];

export const getThemePreset = (key: string) => themePresets.find((p) => p.key === key) || themePresets[0];

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const presetRgba = (preset: ThemePreset, alpha: number) => {
  const [r, g, b] = hexToRgb(preset.primary);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 同步 CSS 变量，让 Tailwind 的 bg-brand / text-brand 等即时跟随主题色
export const applyThemePreset = (preset: ThemePreset, colorMode: ColorMode = 'light') => {
  const root = document.documentElement.style;
  const [r, g, b] = hexToRgb(preset.primary);
  const [ar, ag, ab] = hexToRgb(preset.accent);
  const isDark = colorMode === 'dark';
  root.setProperty('--color-primary', preset.primary);
  root.setProperty('--color-brand', preset.primary);
  root.setProperty('--color-brand-hover', preset.hover);
  root.setProperty('--color-brand-soft', `rgba(${r}, ${g}, ${b}, ${isDark ? 0.18 : 0.09})`);
  root.setProperty('--color-accent', preset.accent);
  root.setProperty('--color-accent-soft', `rgba(${ar}, ${ag}, ${ab}, ${isDark ? 0.14 : 0.08})`);
  root.setProperty('--color-rail-ink-selected', `rgba(${r}, ${g}, ${b}, 0.18)`);
  root.setProperty('--color-rail-ink-selected-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
  root.setProperty('--color-info', isDark ? preset.accent : preset.hover);
  root.setProperty('--color-info-soft', `rgba(${r}, ${g}, ${b}, ${isDark ? 0.2 : 0.12})`);
};

// Frame 使用 .dark class 驱动暗色变体（历史页面依赖 dark: 前缀）
export const applyColorMode = (mode: ColorMode) => {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.style.colorScheme = mode;
};

export const getEffectiveSidebarStyle = (colorMode: ColorMode, sidebarStyle: SidebarStyle): SidebarStyle =>
  colorMode === 'dark' ? 'dark' : sidebarStyle;

export const isLightSidebarStyle = (colorMode: ColorMode, sidebarStyle: SidebarStyle) =>
  getEffectiveSidebarStyle(colorMode, sidebarStyle) === 'light';

interface ConfigStore {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (style: SidebarStyle) => void;
  primaryColor: string;
  setPrimaryColor: (key: string) => void;
  refreshPageRouteIndexes: Record<string, number>;
  triggerPageRefresh: (path: string) => void;
  getPageRefreshIndex: (path: string) => number;
}

const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      colorMode: 'light',
      sidebarStyle: 'light',
      primaryColor: 'classic',
      refreshPageRouteIndexes: {},
      triggerPageRefresh: (path: string) => {
        if (!path) return;
        set((state) => ({
          refreshPageRouteIndexes: {
            ...state.refreshPageRouteIndexes,
            [path]: (state.refreshPageRouteIndexes[path] || 0) + 1,
          },
        }));
      },
      getPageRefreshIndex: (path: string) => {
        if (!path) return 0;
        return get().refreshPageRouteIndexes[path] || 0;
      },
      setColorMode: (colorMode: ColorMode) => {
        applyColorMode(colorMode);
        applyThemePreset(getThemePreset(get().primaryColor), colorMode);
        set({ colorMode });
      },
      setSidebarStyle: (sidebarStyle: SidebarStyle) => {
        set({ sidebarStyle });
      },
      setPrimaryColor: (key: string) => {
        set({ primaryColor: key });
        applyThemePreset(getThemePreset(key), get().colorMode);
      },
    }),
    {
      name: 'config_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        colorMode: state.colorMode,
        sidebarStyle: state.sidebarStyle,
        primaryColor: state.primaryColor,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.colorMode) applyColorMode(state.colorMode);
        if (state?.primaryColor) applyThemePreset(getThemePreset(state.primaryColor), state.colorMode || 'light');
      },
    },
  ),
);

export default useConfigStore;
