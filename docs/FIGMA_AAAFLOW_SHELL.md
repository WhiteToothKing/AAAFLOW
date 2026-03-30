# AAAFLOW 主壳（Figma Page 1）

**设计文件**：[AAAFLOW-Design](https://www.figma.com/design/rannItWO6RPfTCAgOHmjM6/AAAFLOW-Design)（`rannItWO6RPfTCAgOHmjM6`）。

## 画板

- **页面**：`Page 1`
- **Frame 名称**：`AAAFLOW Desktop Shell`
- **节点 id**：`20:263496`
- **构成**：Ant Design GUI KIT 实例 — Layout Sider（Light）、Layout Header（Light · 空 · Level 1）、Layout Content（Empty），1280×800，背景 `#F5F5F5`。

## 集成到仓库的推荐方式

1. **一键同步（推荐）**：配置根目录 `.env` 后，在 `frontend` 下执行 **`npm run figma:sync`**（详见 **`docs/FIGMA_TO_APP_PIPELINE.md`**）：自动下载 PNG 并生成 `frontend/src/generated/figmaShellLayout.ts`。
2. **运行时 UI**：`DesktopAppShell.tsx` 与 Web 端 `AppLayout` 读取 `figmaShellLayout`，与稿对齐侧栏宽、顶栏高、背景色。
3. **对照页**：路由 **`/design/figma`** 显示同步后的 PNG。

## Auto layout 注意

通过 Vibma/API 创建 auto layout 时，`counterAxisAlignItems` 仅支持 `MIN` | `MAX` | `CENTER` | `BASELINE`，不要使用 `STRETCH`。
