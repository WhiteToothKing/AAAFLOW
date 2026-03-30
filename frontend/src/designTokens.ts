/**
 * 视觉与 Figma「AAAFLOW · 功能界面」/ Ant Design System for Figma 对齐：
 * 主色、线色 #d9d9d9、槽位浅底 #fafafa、次要字色 #595959、圆角 8、壳背景随 figma:sync。
 */
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

import { figmaShellLayout } from './generated/figmaShellLayout';

const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

/** 静态 Token（可被 buildAntDesignTheme 与壳层变量合并） */
export const designTokens = {
  antdToken: {
    colorPrimary: '#1677FF',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677FF',

    colorText: 'rgba(0, 0, 0, 0.88)',
    colorTextSecondary: '#595959',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',

    /** 控件、卡片描边（稿面默认线） */
    colorBorder: '#d9d9d9',
    /** 分割线、浅分隔 */
    colorBorderSecondary: '#f0f0f0',
    colorSplit: 'rgba(0, 0, 0, 0.06)',

    colorBgContainer: '#ffffff',
    colorFillAlter: '#fafafa',
    colorFillSecondary: 'rgba(0, 0, 0, 0.04)',

    borderRadius: 8,
    borderRadiusLG: 8,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    lineHeight: 1.5714285714285714,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6666666666666667,
    fontWeightStrong: 600,
    fontFamily: font,

    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,

    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,

    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary:
      '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
  },
} as const;

const t = designTokens.antdToken;

/**
 * 全局 ConfigProvider 主题：合并稿面色板 + `figmaShellLayout` 壳层背景（npm run figma:sync）。
 */
export function buildAntDesignTheme(): ThemeConfig {
  const figma = figmaShellLayout;

  return {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      ...t,
      colorBgLayout: figma.shellBackground,
      colorBgElevated: figma.headerBackground,
    },
    components: {
      Layout: {
        headerBg: figma.headerBackground,
        bodyBg: figma.shellBackground,
        siderBg: figma.siderBackground,
        triggerBg: figma.siderBackground,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: 'rgba(22, 119, 255, 0.08)',
        itemSelectedColor: t.colorPrimary,
        itemHoverBg: figma.shellBackground,
        itemActiveBg: 'rgba(22, 119, 255, 0.12)',
        itemBorderRadius: 6,
        iconSize: 16,
        collapsedIconSize: 16,
        fontSize: 14,
        itemMarginInline: 8,
        itemMarginBlock: 4,
      },
      Card: {
        borderRadiusLG: 8,
        paddingLG: 24,
        boxShadowTertiary: t.boxShadowTertiary,
      },
      Button: {
        borderRadius: 8,
        controlHeight: t.controlHeight,
        controlHeightLG: t.controlHeightLG,
        paddingContentHorizontal: 16,
      },
      Table: {
        headerBg: t.colorFillAlter,
        headerColor: t.colorText,
        headerSplitColor: t.colorBorderSecondary,
        borderColor: t.colorBorderSecondary,
        rowHoverBg: t.colorFillAlter,
        fontSize: 14,
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },
      Input: {
        borderRadius: 8,
        activeShadow: '0 0 0 2px rgba(22, 119, 255, 0.08)',
      },
      Select: {
        borderRadius: 8,
        optionSelectedBg: 'rgba(22, 119, 255, 0.08)',
      },
      Modal: {
        borderRadiusLG: 8,
      },
      Steps: {
        iconSize: 28,
        iconFontSize: 14,
      },
      Tabs: {
        titleFontSize: 14,
        horizontalItemGutter: 24,
      },
      Badge: {
        textFontSize: 12,
      },
      Divider: {
        colorSplit: t.colorBorderSecondary,
      },
    },
  };
}
