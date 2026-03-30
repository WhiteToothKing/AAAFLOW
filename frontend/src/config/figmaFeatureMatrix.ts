/**
 * 应用路由 ↔ Figma 画布建议命名 ↔ 落地方式（单一事实来源，供 /design/figma 与走查使用）
 * 主壳节点见 docs/FIGMA_AAAFLOW_SHELL.md；整页对照 PNG 见 FIGMA_CLIENT_SCREENS_NODE_ID。
 */
export type FigmaParityTier =
  | 'shell-synced'
  | 'pro-page'
  | 'custom-page'
  | 'dev-only';

export interface FigmaFeatureRow {
  path: string;
  title: string;
  /** 建议在「AAAFLOW · 功能界面（客户端对照）」画布中使用的 Frame 名称 */
  figmaSuggestedFrame: string;
  tier: FigmaParityTier;
  notes: string;
}

export const FIGMA_PARITY_TIER_LABEL: Record<FigmaParityTier, string> = {
  'shell-synced': '壳层已同步',
  'pro-page': 'Pro 页面结构',
  'custom-page': '自定义布局 + Token',
  'dev-only': '开发/启动页',
};

export const figmaFeatureMatrix: FigmaFeatureRow[] = [
  {
    path: '/login',
    title: '登录',
    figmaSuggestedFrame: 'Login / 登录',
    tier: 'custom-page',
    notes: '全屏独立页；色板与圆角与 designTokens 一致；无侧栏。',
  },
  {
    path: '/bootstrap',
    title: '桌面启动（Docker）',
    figmaSuggestedFrame: 'Desktop Bootstrap（可选）',
    tier: 'dev-only',
    notes: 'Electron 环境；可与主壳同色背景对齐。',
  },
  {
    path: '/',
    title: '工作台',
    figmaSuggestedFrame: 'Dashboard',
    tier: 'custom-page',
    notes: '统计卡与快捷入口；与对照 PNG 并排走查。',
  },
  {
    path: '/chat',
    title: 'AI 对话',
    figmaSuggestedFrame: 'Chat / AI Workspace',
    tier: 'custom-page',
    notes: '桌面端全高内容区 padding=0；与稿比对时注意留白。',
  },
  {
    path: '/create',
    title: '提交需求',
    figmaSuggestedFrame: 'Task Create',
    tier: 'pro-page',
    notes: 'PageContainer + ProCard，与 Figma 列表/表单区结构一致。',
  },
  {
    path: '/wizard',
    title: '需求向导',
    figmaSuggestedFrame: 'Demand Wizard',
    tier: 'pro-page',
    notes: '分步表单；建议在 Figma 中单独一帧。',
  },
  {
    path: '/tasks',
    title: '任务列表',
    figmaSuggestedFrame: 'Task List',
    tier: 'pro-page',
    notes: 'ProTable 标准列表页。',
  },
  {
    path: '/tasks/:id',
    title: '任务详情',
    figmaSuggestedFrame: 'Task Detail',
    tier: 'pro-page',
    notes: '详情 + 结果图；动态路由。',
  },
  {
    path: '/workflows',
    title: '工作流管理',
    figmaSuggestedFrame: 'Workflows',
    tier: 'pro-page',
    notes: 'ComfyUI 工作流列表。',
  },
  {
    path: '/users',
    title: '用户管理',
    figmaSuggestedFrame: 'User Management（管理员）',
    tier: 'pro-page',
    notes: '管理员；建议在 Figma 对照画布补一帧与表格列对齐。',
  },
  {
    path: '/audit',
    title: '审计日志',
    figmaSuggestedFrame: 'Audit Logs',
    tier: 'pro-page',
    notes: '管理员；ProTable。',
  },
  {
    path: '/settings',
    title: '系统设置',
    figmaSuggestedFrame: 'System Settings',
    tier: 'pro-page',
    notes: '管理员；只读配置卡片组。',
  },
  {
    path: '/profile',
    title: '个人中心',
    figmaSuggestedFrame: 'Profile',
    tier: 'pro-page',
    notes: '资料 / 安全 / 统计 Tabs。',
  },
  {
    path: '/notifications',
    title: '通知中心',
    figmaSuggestedFrame: 'Notifications',
    tier: 'pro-page',
    notes: 'WebSocket 推送列表；建议在 Figma 定义列表卡片样式。',
  },
  {
    path: '/design/figma',
    title: '设计对照',
    figmaSuggestedFrame: '—',
    tier: 'shell-synced',
    notes: '展示 figma:sync 导出 PNG，不参与业务交互稿 1:1。',
  },
  {
    path: '/error/*',
    title: '错误页（403/404/500）',
    figmaSuggestedFrame: 'Error States',
    tier: 'custom-page',
    notes: 'Result + 操作按钮；与品牌色一致。',
  },
];
