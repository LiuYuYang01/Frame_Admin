import useUserStore from './modules/user'
import useTabsStore from './modules/tabs'
import useConfigStore, {
  themePresets,
  getThemePreset,
  presetRgba,
  applyThemePreset,
  applyColorMode,
  isLightSidebarStyle,
} from './modules/config'

export {
  useUserStore,
  useTabsStore,
  useConfigStore,
  themePresets,
  getThemePreset,
  presetRgba,
  applyThemePreset,
  applyColorMode,
  isLightSidebarStyle,
}
export type { SidebarStyle, ColorMode, ThemePreset } from './modules/config'
