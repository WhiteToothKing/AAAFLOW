# Figma MCP + Figma Make 与 AAAFLOW 前端对接说明

（若你说的是「在 Figma 里用 MCP / Make 做界面」，通常对应 **Figma** 官方 MCP；「vibma」多为 **Figma** 的输入笔误。）

## 能做什么

- **Figma Design**：把某个 Frame / 组件的链接发给 Cursor，让 AI 按设计稿改 `frontend` 里的 React 界面（布局、样式、文案）。
- **Figma Make**：通过 MCP 的 **Resources** 能力，把 Make 项目里的原型上下文（文件列表、代码资源）拉进对话，再落到本仓库的真实代码里（见官方说明：[Bringing Make context to your agent](https://developers.figma.com/docs/figma-mcp-server/bringing-make-context-to-your-agent/)）。

MCP **不会自动替换**你仓库里的文件；它给 Cursor 里的 AI **提供设计上下文**，由你在对话里要求「按 Figma 实现到 `frontend/src/...`」来完成改动。

## 在 Cursor 里连接 Figma MCP（推荐做法）

1. 在 Cursor 的 Agent 对话里输入（官方推荐）：

   ```text
   /add-plugin figma
   ```

   按提示安装并完成 **OAuth 登录**。

2. 或手动添加远程 MCP（与官方文档一致）：

   - 使用官方深链安装（文档：[Remote server installation](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) 里 **Cursor** 一节），或  
   - 在本机 Cursor 的 MCP 配置里增加 HTTP 服务，示例见仓库内 `docs/cursor-mcp-figma.example.json`。

远程服务地址为：**`https://mcp.figma.com/mcp`**（无需 Figma 桌面版即可用）。

## 与本项目协作时的建议

- **技术栈**：`frontend` 为 **React + TypeScript + Vite**，UI 以 **Ant Design 5** 为主；改界面时优先用现有组件与布局，避免与 `DesktopShell.tsx`、`pages/ChatWorkspace.tsx` 等已有结构冲突。
- **设计 → 代码**：在 Figma 里选中 Frame，复制 **带 node-id 的链接**，在 Cursor 里说清要改的文件路径，例如：「按这个 Figma 链接调整聊天区顶栏与侧栏，只改 `frontend/src/...`」。
- **Make → 生产代码**：把 **Make 项目链接**贴进对话，让 AI 先通过 MCP 拉取 Make 资源，再说明要对应到本仓库的哪个页面/组件。

## 规则与输出质量

官方建议为代理配置 **Rules**，减少「随便生成一套新组件」的漂移。可在 Cursor 项目规则里写明：必须使用 Ant Design、主题色、现有路由与 API 封装等。参考：[Figma MCP — custom rules](https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/)。

## 限制说明

- MCP 是否在 Cursor 中可用、是否收费，以 **Figma 与 Cursor 当前政策**为准（远程 MCP 文档中有 beta / 计费相关说明）。
- **Code Connect**、**Code to canvas（网页抓屏回 Figma）** 等功能依赖客户端支持情况，以 [Figma MCP 文档](https://developers.figma.com/docs/figma-mcp-server/) 为准。

## 仓库内示例配置

复制 `docs/cursor-mcp-figma.example.json` 的内容到你本机 Cursor / VS Code 的 MCP 配置（字段名若与 Cursor 版本不一致，可在 **Settings → MCP** 里用 UI 添加 **URL：`https://mcp.figma.com/mcp`** 的 HTTP 服务），完成浏览器授权后即可在本项目中使用。
