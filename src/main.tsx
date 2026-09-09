import { useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import RouterList from '@/components/RouterList';
import './styles/global.css';
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useConfigStore, getThemePreset, presetRgba, applyThemePreset } from '@/stores';

const App = () => {
  const primaryColor = useConfigStore((s) => s.primaryColor);
  const colorMode = useConfigStore((s) => s.colorMode);
  const isDark = colorMode === 'dark';

  const preset = useMemo(() => getThemePreset(primaryColor), [primaryColor]);

  useEffect(() => {
    applyThemePreset(preset, colorMode);
  }, [preset, colorMode]);

  const theme = useMemo(() => {
    const outline = presetRgba(preset, 0.16);
    const selectedBg = presetRgba(preset, 0.18);
    const lineColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#E4E7EC';
    const panelBg = isDark ? '#151B26' : '#FFFFFF';
    const elevatedBg = isDark ? '#1E2738' : '#FFFFFF';
    const fieldBg = isDark ? '#121820' : '#FFFFFF';
    const canvasBg = isDark ? '#0B0F14' : '#F5F6F8';
    const ink = isDark ? '#EEF2F8' : '#101828';
    const inkMuted = isDark ? '#B0BDD4' : '#475467';
    const inkFaint = isDark ? '#8A99B8' : '#98A2B3';
    const rowHover = isDark ? '#252F42' : '#F7F8FA';
    const railBg = isDark ? '#1F2838' : '#F8F9FB';
    return {
      cssVar: { key: 'frame-admin' },
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: preset.primary,
        colorInfo: preset.accent,
        colorError: '#D92D20',
        colorLink: preset.primary,
        colorTextBase: ink,
        colorText: ink,
        colorTextSecondary: inkMuted,
        colorTextTertiary: inkFaint,
        colorTextQuaternary: inkFaint,
        colorBgBase: panelBg,
        colorBgContainer: panelBg,
        colorBgElevated: elevatedBg,
        colorBgLayout: canvasBg,
        colorFillSecondary: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F2F4F7',
        colorFillTertiary: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8F9FB',
        colorFillQuaternary: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FCFCFD',
        colorBorder: lineColor,
        colorBorderSecondary: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F4F7',
        colorBgTextHover: rowHover,
        colorFillContentHover: rowHover,
        colorFillSecondaryHover: rowHover,
        colorPrimaryHover: preset.hover,
        borderRadius: 8,
        borderRadiusLG: 10,
        borderRadiusSM: 6,
        fontFamily: '"Source Sans 3", "Noto Sans SC", system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 14,
        controlHeight: 36,
        controlOutline: outline,
        controlOutlineWidth: 3,
        wireframe: false,
      },
      components: {
        Button: {
          primaryShadow: 'none',
          defaultShadow: 'none',
          dangerShadow: 'none',
          fontWeight: 560,
          contentLineHeight: 1,
          defaultBg: panelBg,
          defaultColor: ink,
          defaultBorderColor: lineColor,
          defaultHoverBg: rowHover,
          defaultHoverColor: ink,
          defaultHoverBorderColor: lineColor,
          defaultActiveBg: rowHover,
          defaultActiveColor: ink,
          defaultActiveBorderColor: lineColor,
          textHoverBg: rowHover,
          textTextHoverColor: ink,
          colorPrimaryHover: preset.hover,
        },
        Input: {
          colorBgContainer: fieldBg,
          colorText: ink,
          colorTextPlaceholder: inkFaint,
          colorBorder: lineColor,
          activeBorderColor: preset.primary,
          hoverBorderColor: preset.primary,
          activeShadow: `0 0 0 3px ${outline}`,
        },
        InputNumber: {
          colorBgContainer: fieldBg,
          colorText: ink,
          colorTextPlaceholder: inkFaint,
          colorBorder: lineColor,
          activeBorderColor: preset.primary,
          hoverBorderColor: preset.primary,
          activeShadow: `0 0 0 3px ${outline}`,
        },
        Select: {
          colorBgContainer: fieldBg,
          colorText: ink,
          colorTextPlaceholder: inkFaint,
          colorBorder: lineColor,
          optionSelectedBg: selectedBg,
          optionActiveBg: rowHover,
          activeBorderColor: preset.primary,
          hoverBorderColor: preset.primary,
          selectorBg: fieldBg,
        },
        DatePicker: {
          colorBgContainer: fieldBg,
          colorText: ink,
          colorTextPlaceholder: inkFaint,
          colorBorder: lineColor,
          activeBorderColor: preset.primary,
          hoverBorderColor: preset.primary,
          activeShadow: `0 0 0 3px ${outline}`,
        },
        Form: {
          labelColor: inkMuted,
        },
        Menu: {
          itemBorderRadius: 8,
          itemMarginInline: 8,
          itemMarginBlock: 2,
          itemHeight: 40,
          iconSize: 16,
          itemBg: 'transparent',
          subMenuItemBg: 'transparent',
          itemSelectedBg: selectedBg,
          itemSelectedColor: '#E6EBF5',
          itemHoverBg: 'rgba(255, 255, 255, 0.05)',
          itemHoverColor: '#E6EBF5',
          itemActiveBg: selectedBg,
          itemColor: '#8A99B8',
          groupTitleColor: '#66738F',
        },
        Table: {
          colorBgContainer: panelBg,
          headerBg: railBg,
          headerColor: inkMuted,
          rowHoverBg: rowHover,
          borderColor: lineColor,
          headerSplitColor: 'transparent',
        },
        Card: {
          paddingLG: 16,
        },
        Tabs: {
          inkBarColor: preset.primary,
          itemSelectedColor: preset.primary,
          itemHoverColor: ink,
          itemActiveColor: preset.primary,
        },
        Layout: {
          siderBg: '#0E1626',
          bodyBg: canvasBg,
          headerBg: panelBg,
        },
        Modal: {
          contentBg: elevatedBg,
          headerBg: elevatedBg,
          titleColor: ink,
          colorIcon: inkFaint,
          colorIconHover: ink,
        },
        Drawer: {
          colorBgElevated: elevatedBg,
        },
        Pagination: {
          itemBg: panelBg,
          itemActiveBg: isDark ? presetRgba(preset, 0.24) : selectedBg,
          itemActiveColor: isDark ? preset.accent : preset.primary,
          colorText: inkMuted,
          colorPrimary: preset.primary,
        },
        Dropdown: {
          colorBgElevated: elevatedBg,
          controlItemBgHover: rowHover,
        },
      },
    };
  }, [preset, isDark]);

  // 静态 Modal.confirm / message / notification 不继承 React 树主题，需通过 holderRender 注入
  useEffect(() => {
    ConfigProvider.config({
      holderRender: (children) => (
        <ConfigProvider locale={zhCN} theme={theme}>
          {children}
        </ConfigProvider>
      ),
    });
  }, [theme]);

  return (
    <ConfigProvider locale={zhCN} theme={theme} componentSize="middle">
      <HeroUIProvider>
        <AntdApp>
          <RouterList />
        </AntdApp>
      </HeroUIProvider>
    </ConfigProvider>
  );
};

const app = createRoot(document.getElementById('root')!);
app.render(<App />);
