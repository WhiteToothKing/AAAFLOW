import { getAccessToken } from '../services/authStorage';

/** 与后端 STATIC_REQUIRE_AUTH 同时开启；构建时 VITE_STATIC_REQUIRE_AUTH=true */
const needsAuth =
  String(import.meta.env.VITE_STATIC_REQUIRE_AUTH || '').toLowerCase() === 'true';

/** 供 <img> / Ant Image：在需鉴权静态时附加 access_token（内网可用，注意勿写入日志） */
export function mediaUrl(path: string | undefined | null): string {
  if (path == null || path === '') return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  if (!needsAuth) return path;
  if (!path.startsWith('/api/files/')) return path;
  const t = getAccessToken();
  if (!t) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}access_token=${encodeURIComponent(t)}`;
}

/** 提交给后端的 URL 不应带 token */
export function stripMediaAuthQuery(path: string): string {
  if (!path.includes('access_token=')) return path;
  const q = path.indexOf('?');
  if (q < 0) return path;
  const base = path.slice(0, q);
  const search = path.slice(q + 1);
  const params = new URLSearchParams(search);
  params.delete('access_token');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}
