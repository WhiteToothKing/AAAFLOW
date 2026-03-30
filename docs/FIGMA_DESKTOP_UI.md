# AAAFLOW 桌面 UI — Figma 与实现说明

**约定**：在本仓库中，用户所说的「继续优化」默认指 **Figma 客户端 GUI** 与 **`npm run figma:sync` 落地到项目**；持久规则见仓库 `.cursor/rules/aaaflow-figma-gui-scope.mdc`，流水线见 `docs/FIGMA_TO_APP_PIPELINE.md`。

## 为什么在 Figma 里好像「没有任何进展」？

常见原因有三点：

1. **线框本来就非常少**  
   当时通过 Vibma 只放了 **3 个节点**：一块 1120×800 的灰底壳、一条顶栏占位、一行小字说明。没有画完整界面、没有组件库，画布上看起来会像「几乎空的」，容易误以为没做。

2. **设计文件地址（团队确认）**  
   官方稿：[AAAFLOW-Design](https://www.figma.com/design/rannItWO6RPfTCAgOHmjM6/AAAFLOW-Design)（file key `rannItWO6RPfTCAgOHmjM6`）。应用内 **`/design/figma`** 页可一键打开；`FIGMA_FILE_KEY` 默认值见 `scripts/figma.env.example`。若你本地仍打不开，请确认已登录有权限的 Figma 账号。

3. **真正成体系的「进展」在代码里**  
   侧栏、工作台、任务、对话等已在 `frontend` 用 React + Ant Design Pro 搭好（见下文「与代码的对应关系」）。Figma 仅作可选线框参考，不是主交付物。

### 若草稿里确实找不到「AAAFLOW Design」

可能从未同步到当前账号，或文件已被删。可任选：

- 在 Cursor 里 **重新启用 Vibma MCP**，打开任意新 Figma 文件后，在对话里说明要在当前文件里创建 **AAAFLOW 桌面壳 + 侧栏 + 主内容区** 线框；或  
- 自己在 Figma 里新建文件，按 `DesktopAppShell` 结构手动画一版（侧栏 220、顶栏 56、主区灰底 `#f5f5f5`）。

---

## Figma（Vibma）里曾经放置过的线框（若文件仍存在）

在文件 **「AAAFLOW Design」** 的 **Page 1** 中，若存在，大致为：

| 节点 ID（仅作参考，随文件可能变化） | 名称 | 说明 |
|--------------------------------------|------|------|
| `2:5` | AAAFLOW PC Shell | 主画板 1120×800，背景 `#F5F5F5` |
| `2:6` | Header | 顶栏占位（白底、底部分割线） |
| `2:7` | 说明文字 | 「AAAFLOW · 桌面客户端线框（Vibma）」 |

在画布上可尝试 **Ctrl/Cmd + F** 搜索 frame 名称 **AAAFLOW** 或 **PC Shell**。若要在 `2:5` 内继续细化，建议先对该 Frame 开启 **Auto layout**，再用 Vibma 追加子 Frame / 文本。

可选的 **Figma 组件库清单**（Ant Design / Dashboard / Fluent 等）见 **`docs/FIGMA_UI_KITS.md`**。

## Figma Make 能否直接出生产代码？

**Figma Make** 更适合做原型与交互演示；**导出到本仓库的 React + Ant Design + Electron** 仍需人工对齐组件与接口（`chatApi`、`healthApi` 等）。  
因此：**设计稿在 Figma 定稿视觉与结构；可运行客户端以本仓库代码为准**（主题色 `#1677FF`、圆角 8、对话区背景 `#FAFAFA` 已与线框对齐）。

## 与代码的对应关系

| 设计意图 | 代码位置 |
|----------|----------|
| 侧栏 + 顶栏 Logo + 连接状态 + 核心路由 | `frontend/src/DesktopAppShell.tsx` |
| 工作台 `/`（统计卡、最近任务、快速操作；主题 token 与稿一致） | `frontend/src/pages/Dashboard.tsx` |
| 对话区 / 历史抽屉 / 输入区 | `frontend/src/pages/ChatWorkspace.tsx`（`embeddedDesktop`） |
| Electron 窗口与启动后台页 | `frontend/electron/main.cjs`；界面为 React 路由 `#/bootstrap`（Ant Design，与主壳一致） |

**全量路由 ↔ 建议在 Figma 对照画布中的帧名**：见应用内 **`/design/figma`** 对照表（含「应用端已落地」「Figma 建帧建议」列）；数据定义在 `frontend/src/config/figmaFeatureMatrix.ts`。Figma 里若尚未为某功能单独建 Frame，可按表中「建议帧名」补画以便与 PNG 导出对齐。

## Windows 安装包

在 `frontend` 目录执行 `npm run electron:pack`，产物在 `frontend/release/`（NSIS 安装程序 + `win-unpacked`）。详见 **`docs/DESKTOP_INSTALLER.md`**。

---

## 新增界面设计需求（v2.0 迭代）

### 需求向导（DemandWizard）增强
- 新增「快速生成」按钮和「一键生成」流程
- 新增 Provider 偏好选择器（支持即梦/MiniMax/Banana Pro 等新选项）
- 技能推荐卡片视觉升级：图标 + Provider 标签 + 模式标签

### 结果对比视图（TaskDetail）
- 新增「对比视图」模式（Segmented 切换）：所有结果图等宽横排
- 生成历史时间线（Timeline 组件）
- 「以此重新生成」操作按钮

### Chat 界面增强
- 输入框支持剪贴板粘贴图片提示
- Skill 卡片推荐区视觉优化

### 桌面客户端
- 系统托盘图标和右键菜单
- 生成完成通知弹窗样式

### 新增 Provider 标识
需要在 Figma 组件库中为以下新 Provider 设计标签/图标：
- 即梦 (Jimeng) — 字节跳动
- MiniMax (海螺 AI)
- Banana Pro

### Figma 同步命令
```bash
cd frontend
npm run figma:sync
```
同步后检查 `frontend/public/figma/` 下的 PNG 和 `frontend/src/generated/figmaShellLayout.ts`。
