/**
 * AAAFLOW Design System — Professional game-art workflow branding.
 * Synced with Figma via figmaShellLayout; extended with brand palette.
 */
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

import { figmaShellLayout } from './generated/figmaShellLayout';

const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

export const brandColors = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryBg: '#EFF6FF',
  primaryBgHover: '#DBEAFE',

  accent: '#7C3AED',
  accentLight: '#8B5CF6',
  accentBg: '#F5F3FF',

  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  info: '#0891B2',
  infoBg: '#ECFEFF',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
} as const;

export const gradients = {
  primaryBtn: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
  heroCard: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)',
  siderActive: 'linear-gradient(90deg, rgba(37,99,235,0.10) 0%, rgba(124,58,237,0.06) 100%)',
  headerGlow: 'linear-gradient(180deg, rgba(37,99,235,0.03) 0%, transparent 100%)',
  statCard1: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
  statCard2: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
  statCard3: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
  statCard4: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(0,0,0,0.04)',
  sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
  card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  cardHover: '0 8px 25px -5px rgba(37,99,235,0.12), 0 4px 10px -5px rgba(0,0,0,0.04)',
  input: '0 0 0 3px rgba(37,99,235,0.10)',
} as const;

export const transitions = {
  fast: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
  normal: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  slow: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  spring: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
} as const;

export const designTokens = {
  antdToken: {
    colorPrimary: brandColors.primary,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    colorInfo: brandColors.info,

    colorText: brandColors.gray900,
    colorTextSecondary: brandColors.gray600,
    colorTextTertiary: brandColors.gray400,
    colorTextQuaternary: brandColors.gray300,

    colorBorder: brandColors.gray200,
    colorBorderSecondary: brandColors.gray100,
    colorSplit: brandColors.gray100,

    colorBgContainer: '#ffffff',
    colorFillAlter: brandColors.gray50,
    colorFillSecondary: brandColors.gray100,

    borderRadius: 10,
    borderRadiusLG: 12,
    borderRadiusSM: 8,
    borderRadiusXS: 6,

    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeHeading1: 30,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    lineHeight: 1.6,
    lineHeightLG: 1.5,
    lineHeightSM: 1.667,
    fontWeightStrong: 600,
    fontFamily: font,

    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,

    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,

    boxShadow: shadows.sm,
    boxShadowSecondary: shadows.lg,
    boxShadowTertiary: shadows.xs,
  },
} as const;

const t = designTokens.antdToken;

export function buildAntDesignTheme(): ThemeConfig {
  const figma = figmaShellLayout;

  return {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      ...t,
      colorBgLayout: figma.shellBackground,
      colorBgElevated: '#ffffff',
    },
    components: {
      Layout: {
        headerBg: '#ffffff',
        bodyBg: figma.shellBackground,
        siderBg: '#ffffff',
        triggerBg: brandColors.gray50,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: brandColors.primaryBg,
        itemSelectedColor: brandColors.primary,
        itemHoverBg: brandColors.gray50,
        itemActiveBg: brandColors.primaryBgHover,
        itemBorderRadius: 8,
        iconSize: 18,
        collapsedIconSize: 18,
        fontSize: 14,
        itemMarginInline: 8,
        itemMarginBlock: 2,
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 24,
        boxShadowTertiary: shadows.card,
      },
      Button: {
        borderRadius: 10,
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
        paddingContentHorizontal: 20,
        fontWeight: 500,
      },
      Table: {
        headerBg: brandColors.gray50,
        headerColor: brandColors.gray700,
        headerSplitColor: brandColors.gray100,
        borderColor: brandColors.gray100,
        rowHoverBg: brandColors.primaryBg,
        fontSize: 14,
        cellPaddingBlock: 14,
        cellPaddingInline: 16,
      },
      Input: {
        borderRadius: 10,
        activeShadow: shadows.input,
        hoverBorderColor: brandColors.primaryLight,
      },
      Select: {
        borderRadius: 10,
        optionSelectedBg: brandColors.primaryBg,
      },
      Modal: {
        borderRadiusLG: 16,
      },
      Steps: {
        iconSize: 32,
        iconFontSize: 14,
      },
      Tabs: {
        titleFontSize: 14,
        horizontalItemGutter: 28,
        inkBarColor: brandColors.primary,
      },
      Badge: {
        textFontSize: 12,
      },
      Divider: {
        colorSplit: brandColors.gray100,
      },
      Tag: {
        borderRadiusSM: 6,
      },
      Tooltip: {
        borderRadius: 8,
      },
      Dropdown: {
        borderRadiusLG: 12,
      },
      Popover: {
        borderRadiusLG: 12,
      },
      Segmented: {
        borderRadius: 10,
        borderRadiusSM: 8,
      },
      Switch: {
        colorPrimary: brandColors.primary,
      },
      Progress: {
        defaultColor: brandColors.primary,
      },
      Notification: {
        borderRadiusLG: 12,
      },
      Message: {
        borderRadiusLG: 10,
      },
    },
  };
}
