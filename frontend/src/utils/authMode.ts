/** 与后端 AUTH_DISABLED 配套：跳过登录页与本地 token 门槛（仅构建时注入，切勿用于生产镜像） */
export function isAuthDisabled(): boolean {
  return import.meta.env.VITE_AUTH_DISABLED === 'true';
}
