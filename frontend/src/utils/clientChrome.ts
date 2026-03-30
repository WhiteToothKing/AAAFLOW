import { figmaShellLayout } from '../generated/figmaShellLayout';

/** 主内容区常用最大宽度（壳宽 − 侧栏），用于表单/居中块与稿面对齐 */
export function mainColumnMaxWidth(): number {
  return Math.max(560, figmaShellLayout.frame.width - figmaShellLayout.siderWidth);
}

/** 登录、全屏页等与稿面一致的中性底 */
export function shellPageBackground(): string {
  return figmaShellLayout.shellBackground;
}
