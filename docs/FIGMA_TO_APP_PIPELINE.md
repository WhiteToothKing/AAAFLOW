# Figma 设计稿 → AAAFLOW 客户端：自动化流水线

**范围约定**：本仓库中用户所说的「继续优化」默认优先指 **维护 Figma 客户端 GUI** 与本流水线 **同步落地**；Cursor 侧见 `.cursor/rules/aaaflow-figma-gui-scope.mdc`。

目标：你在 Figma 里确认主壳 Frame 后，一条命令把 **官方渲染 PNG** 拉进仓库，并把 **侧栏宽、顶栏高、背景色** 等与壳层相关的量写回代码，使 **Electron / Web 壳与稿面一致**（在 Ant Design 能力范围内对齐；复杂页面需继续手写组件）。

**设计稿与程序能否像素级 1:1？** 见 **`docs/DESIGN_PARITY.md`**（结论：整应用不能保证逐像素一致；PNG 导出与壳层数值可对齐）。

## 能力边界（诚实说明）

| 环节 | 本流水线做什么 | 不做什么 |
|------|----------------|----------|
| 像素级整页 | PNG 由 Figma 服务端渲染，与画布一致 | 不会把整页变成一张不可点的大图塞进生产交互区 |
| 可点 UI | 壳层尺寸/颜色来自节点树 + 你现有 React | 不会从任意 Figma 图层自动生成完整业务页面代码 |
| 确认后自动化 | `npm run figma:sync` 可 CI / 本地一键 | 仍需 Personal Access Token（勿提交 Git） |

与 **蓝湖** 的关系：蓝湖偏标注与协作；本方案用 **Figma REST API** 直接拉 **导出图 + 原始节点数据**，适合「确认 O 后自动进仓库」。

## 一次性配置

1. **Figma Personal access token**  
   [Figma Account → Settings → Security](https://www.figma.com/settings) 创建 token。

2. **文件 Key**  
   浏览器打开设计文件，URL 形如：  
   `https://www.figma.com/design/XXXXXXXXXXXX/文件名`  
   其中 **`XXXXXXXXXXXX`** 即为 `FIGMA_FILE_KEY`。

3. **环境变量**（`scripts/figma-sync.mjs` 会依次读取 `backend/.env` → 根目录 `.env` → `frontend/.env` → `frontend/.env.local`，**后者覆盖前者**；这些文件均勿提交 Git）  
   可复制 `scripts/figma.env.example` 中的键名到**任一会被读取的文件**（常见：根目录 `.env` 或 `backend/.env`）：

   - `FIGMA_ACCESS_TOKEN`
   - `FIGMA_FILE_KEY`
   - `FIGMA_SHELL_NODE_ID`（默认 `20:263496`，对应 Page 1「AAAFLOW Desktop Shell」）
   - `FIGMA_CLIENT_SCREENS_NODE_ID`（可选，示例 `131:283849`：画布页「AAAFLOW · 功能界面（客户端对照）」整页 PNG → `public/figma/aaaflow-client-screens.png`）
   - `FIGMA_EXPORT_SCALE`（可选，默认 `2`）

4. 确保该 token 对目标文件有 **View** 权限（团队文件需相应权限）。

## 你确认设计后的标准操作

在 **frontend** 目录执行：

```bash
npm run figma:sync
```

等价于依次：

- `npm run figma:export` — 调用 Figma Images API：主壳 PNG → `frontend/public/figma/aaaflow-main-shell.png`；若配置了 `FIGMA_CLIENT_SCREENS_NODE_ID`，另存 `aaaflow-client-screens.png`
- `npm run figma:layout` — 调用 Files → Nodes API，解析主 Frame 子级 → 覆盖 `frontend/src/generated/figmaShellLayout.ts`

然后构建客户端：

```bash
npm run build:desktop
# 或开发
npm run electron:dev
```

浏览器对照：`/design/figma` 会显示同步后的 PNG。

## 代码里如何用

- `DesktopAppShell.tsx`、`App.tsx` 中的 **Sider 宽度、Header 高度、内容区/壳背景色** 已读取 `figmaShellLayout`。
- 修改 Figma 布局后**务必再跑** `figma:sync`，否则只有 PNG 更新、或只有布局更新（若你只跑子命令）。

## 更换主 Frame 节点

在 Figma 选中新的顶层 Frame → 右键 **Copy link**，链接里的 `node-id=12-345678` 转成 `12:345678` 写入 `FIGMA_SHELL_NODE_ID`。

## 故障排查

- **401 / 403**：token 无效或无权访问该文件。
- **未返回 PNG URL**：偶发排队，几秒后重试 `npm run figma:export`。
- **布局数值不对**：主壳应为 **横向 Auto layout**，左 Sider、右纵向「顶栏 + 内容」；脚本按该结构取第一个子级宽度与顶栏高度。若结构不同，需改 `scripts/figma-sync.mjs` 里 `extractShellLayout`。

## 与 Vibma / Cursor MCP 的关系

在对话里用 Vibma **搭界面**；**落盘与 CI** 用本脚本 + Figma REST API，不依赖 Cursor 是否打开。
