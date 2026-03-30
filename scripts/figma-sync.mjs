#!/usr/bin/env node
/**
 * Figma → AAAFLOW 前端：官方渲染 PNG + 从节点树提取壳层尺寸/背景色 → 生成 TS 常量。
 *
 * 用法（在 frontend 目录）：
 *   npm run figma:export   # 仅下载 PNG
 *   npm run figma:layout   # 仅写 figmaShellLayout.ts
 *   npm run figma:sync     # 两者
 *
 * 依赖环境变量：FIGMA_ACCESS_TOKEN、FIGMA_FILE_KEY（见 scripts/figma.env.example）。
 * 加载顺序：backend/.env → 根目录 .env → frontend/.env → frontend/.env.local（后者覆盖前者）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PNG = path.join(REPO_ROOT, 'frontend', 'public', 'figma', 'aaaflow-main-shell.png');
/** 可选：整页「AAAFLOW · 功能界面（客户端对照）」导出，供 /design/figma 对照 */
const OUT_CLIENT_SCREENS = path.join(
  REPO_ROOT,
  'frontend',
  'public',
  'figma',
  'aaaflow-client-screens.png',
);
const OUT_LAYOUT = path.join(REPO_ROOT, 'frontend', 'src', 'generated', 'figmaShellLayout.ts');

const FIGMA_API = 'https://api.figma.com/v1';

function loadEnvFiles() {
  const merged = {};
  // 后加载的覆盖先加载的；backend/.env 便于与后端密钥同文件维护 FIGMA_*（亦可只用根目录 .env）
  for (const rel of [
    path.join('backend', '.env'),
    '.env',
    path.join('frontend', '.env'),
    path.join('frontend', '.env.local'),
  ]) {
    const p = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      // 后加载的文件里若为空字符串，不覆盖先前已解析到的值（避免根 .env 空行盖掉 backend/.env）
      if (v === '' && merged[m[1]] !== undefined && merged[m[1]] !== '') continue;
      merged[m[1]] = v;
    }
  }
  return merged;
}

function normalizeNodeId(id) {
  if (!id) return '';
  return String(id).trim().replace(/-/g, ':');
}

function solidFillToHex(fill) {
  if (!fill || fill.type !== 'SOLID' || !fill.color) return null;
  const { r, g, b } = fill.color;
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

function firstSolidHexFromNode(node) {
  const fills = node.fills;
  if (!Array.isArray(fills)) return null;
  const visible = fills.filter((f) => f && f.visible !== false);
  for (const f of visible) {
    const h = solidFillToHex(f);
    if (h) return h;
  }
  return null;
}

function boxW(node) {
  const b = node.absoluteBoundingBox;
  if (b && typeof b.width === 'number' && b.width > 0) return Math.round(b.width);
  return null;
}

function boxH(node) {
  const b = node.absoluteBoundingBox;
  if (b && typeof b.height === 'number' && b.height > 0) return Math.round(b.height);
  return null;
}

function extractShellLayout(root) {
  const frameW = boxW(root) ?? 1280;
  const frameH = boxH(root) ?? 800;
  const shellBg = firstSolidHexFromNode(root) ?? '#f5f5f5';

  let siderWidth = 220;
  let headerHeight = 56;
  let contentAreaBackground = shellBg;
  let siderBackground = '#ffffff';
  let headerBackground = '#ffffff';

  const ch = root.children;
  if (Array.isArray(ch) && ch.length >= 2 && root.layoutMode === 'HORIZONTAL') {
    const w0 = boxW(ch[0]);
    if (w0) siderWidth = w0;
    const sb = firstSolidHexFromNode(ch[0]);
    if (sb) siderBackground = sb;
    const main = ch[1];
    if (main && main.layoutMode === 'VERTICAL' && Array.isArray(main.children) && main.children.length >= 1) {
      const h0 = boxH(main.children[0]);
      if (h0) headerHeight = h0;
      const hb = firstSolidHexFromNode(main.children[0]);
      if (hb) headerBackground = hb;
      const mainBg = firstSolidHexFromNode(main);
      if (mainBg) contentAreaBackground = mainBg;
    }
  }

  return {
    frame: { width: frameW, height: frameH },
    siderWidth,
    headerHeight,
    shellBackground: shellBg,
    contentAreaBackground,
    siderBackground,
    headerBackground,
  };
}

function layoutTsContent(nodeId, layout, generatedAt) {
  return `/**
 * 由 scripts/figma-sync.mjs 根据 Figma 节点生成 — 勿手改；更新请运行 npm run figma:sync
 * 节点: ${nodeId}
 */
export const figmaShellLayout = {
  sourceNodeId: '${nodeId}' as const,
  generatedAt: ${JSON.stringify(generatedAt)} as string | null,
  frame: { width: ${layout.frame.width}, height: ${layout.frame.height} },
  siderWidth: ${layout.siderWidth},
  headerHeight: ${layout.headerHeight},
  shellBackground: ${JSON.stringify(layout.shellBackground)},
  contentAreaBackground: ${JSON.stringify(layout.contentAreaBackground)},
  siderBackground: ${JSON.stringify(layout.siderBackground)},
  headerBackground: ${JSON.stringify(layout.headerBackground)},
} as const;
`;
}

async function figmaFetch(token, urlPath) {
  const url = `${FIGMA_API}${urlPath}`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.err || data.message || res.statusText || String(res.status);
    throw new Error(`Figma API ${res.status}: ${msg}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function exportPng({ token, fileKey, nodeId, scale, outPath = OUT_PNG }) {
  const idParam = encodeURIComponent(nodeId);
  const scaleParam = encodeURIComponent(String(scale));
  let imageUrl;
  for (let i = 0; i < 8; i++) {
    const data = await figmaFetch(
      token,
      `/images/${fileKey}?ids=${idParam}&format=png&scale=${scaleParam}`,
    );
    imageUrl = data.images && data.images[nodeId];
    if (imageUrl) break;
    await sleep(2000);
  }
  if (!imageUrl) throw new Error(`Figma 未返回 PNG 地址（节点 ${nodeId}，可稍后重试 figma:export）`);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`下载 PNG 失败: ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return outPath;
}

async function pullLayout({ token, fileKey, nodeId }) {
  const idParam = encodeURIComponent(nodeId);
  const data = await figmaFetch(token, `/files/${fileKey}/nodes?ids=${idParam}&depth=12`);
  const nodes = data.nodes || {};
  const entry = nodes[nodeId];
  if (!entry || !entry.document) {
    throw new Error(`未找到节点 ${nodeId}，请检查 FIGMA_SHELL_NODE_ID 与文件权限`);
  }
  const doc = entry.document;
  const layout = extractShellLayout(doc);
  const generatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT_LAYOUT), { recursive: true });
  fs.writeFileSync(OUT_LAYOUT, layoutTsContent(nodeId, layout, generatedAt), 'utf8');
  return { layout, OUT_LAYOUT };
}

async function main() {
  const cmd = (process.argv[2] || 'all').toLowerCase();
  const env = { ...process.env, ...loadEnvFiles() };
  const token = env.FIGMA_ACCESS_TOKEN?.trim();
  const fileKey = env.FIGMA_FILE_KEY?.trim();
  const nodeId = normalizeNodeId(env.FIGMA_SHELL_NODE_ID || '20:263496');
  const clientScreensNodeId = normalizeNodeId(env.FIGMA_CLIENT_SCREENS_NODE_ID || '');
  const scale = Math.min(4, Math.max(1, parseInt(env.FIGMA_EXPORT_SCALE || '2', 10) || 2));

  if (!token || !fileKey) {
    console.error(
      '缺少 FIGMA_ACCESS_TOKEN 或 FIGMA_FILE_KEY。\n请写入根目录 .env、backend/.env 或 frontend/.env.local（见 scripts/figma.env.example，勿提交 Git）。',
    );
    process.exit(1);
  }

  if (!['export', 'layout', 'all'].includes(cmd)) {
    console.error('用法: node scripts/figma-sync.mjs [export|layout|all]');
    process.exit(1);
  }

  try {
    if (cmd === 'export' || cmd === 'all') {
      const out = await exportPng({ token, fileKey, nodeId, scale });
      console.log('已写入主壳 PNG:', out);
      if (clientScreensNodeId && clientScreensNodeId !== nodeId) {
        const outScreens = await exportPng({
          token,
          fileKey,
          nodeId: clientScreensNodeId,
          scale,
          outPath: OUT_CLIENT_SCREENS,
        });
        console.log('已写入功能界面对照 PNG:', outScreens);
      } else if (!clientScreensNodeId) {
        console.log(
          '（可选）未设置 FIGMA_CLIENT_SCREENS_NODE_ID，跳过「功能界面」整页导出；见 scripts/figma.env.example',
        );
      }
    }
    if (cmd === 'layout' || cmd === 'all') {
      const { layout, OUT_LAYOUT: p } = await pullLayout({ token, fileKey, nodeId });
      console.log('已写入布局:', p);
      console.log(JSON.stringify(layout, null, 2));
    }
    console.log('完成。建议执行: cd frontend && npm run build');
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

main();
