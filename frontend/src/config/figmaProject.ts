/**
 * AAAFLOW 官方 Figma 设计文件（与 Vibma / 团队画布一致）
 * @see https://www.figma.com/design/rannItWO6RPfTCAgOHmjM6/AAAFLOW-Design
 */
export const FIGMA_DESIGN_FILE_KEY = 'rannItWO6RPfTCAgOHmjM6' as const;
export const FIGMA_DESIGN_FILE_SLUG = 'AAAFLOW-Design' as const;

/** 设计文件根链接（无 node 聚焦） */
export const FIGMA_DESIGN_URL = `https://www.figma.com/design/${FIGMA_DESIGN_FILE_KEY}/${FIGMA_DESIGN_FILE_SLUG}` as const;

/** 分享链接中的登录页节点（node-id=234-417840 → API 格式 234:417840） */
export const FIGMA_NODE_LOGIN_SHARED = '234:417840' as const;

/** 主内容区与对照页推荐最大宽度（与 1280 壳宽配套走查） */
export const FIGMA_CONTENT_MAX_WIDTH_PX = 1320;

/** 生成带节点深链的 Figma URL（nodeId 形如 `20:263496` 或 `234:417840`） */
export function figmaFileUrl(nodeId?: string): string {
  if (!nodeId) return FIGMA_DESIGN_URL;
  const q = nodeId.replace(/:/g, '-');
  return `${FIGMA_DESIGN_URL}?node-id=${encodeURIComponent(q)}`;
}
