# Cursor 里 MCP 配置放哪？会不会有「两份」？

## 1. 默认是不是 `mcp.json`？

对 **按文件夹打开的项目** 来说，Cursor 会认项目根目录下的：

**`.cursor/mcp.json`**

顶层字段一般是 **`mcpServers`**（对象，每个 key 是一个 MCP 服务名）。

> 少数文档或旧版 UI 会写成 `servers` + `type: http`（偏 VS Code / Figma 远程 MCP），和本项目里 **stdio** 用的 **`mcpServers`** 形状不同；**不要混在同一个文件里用两套顶层结构**，只保留 Cursor 当前版本支持的那一种。

## 2. 还有没有「另一份」配置？

有，常见两类：

| 位置 | 说明 |
|------|------|
| **项目** `.cursor/mcp.json` | 只影响 **打开这个仓库** 时加载的 MCP。 |
| **Cursor 设置里的 MCP（User / 全局）** | 在 **Settings → MCP** 里添加的，会作用到多个工作区；**不一定**对应你磁盘上的某个 `mcp.json` 文件名，但和项目级是 **叠加或按 Cursor 规则合并** 的。 |

若你发现「改了一个地方不生效」，多半是看错了层级：**全局 vs 当前仓库**，或改完没 **Reload / 重启 Cursor**。

## 3. 「重复」怎么合并成一个？

### 合并规则

- 只保留 **一个** JSON 根对象。
- 下面只保留 **一个** `mcpServers`。
- **每个服务名（key）唯一**，例如不能有两个都叫 `gemini`；若要保留两个入口，请改名如 `gemini` / `gemini-legacy`。
- **`coze-local` 这类带相对路径的**：`"args": ["scripts/coze-mcp-server.js"]` 是相对于 **当前工作区根目录** 的；不同仓库要分别存在对应脚本，或改成 **绝对路径** 指向同一个 `coze-mcp-server.js`。

### 多仓库共用同一份配置（可选）

- **复制粘贴**：把合并后的 `mcpServers` 拷到每个仓库的 `.cursor/mcp.json`（注意改相对路径）。
- **Windows 符号链接**（高级）：让一个仓库的 `.cursor/mcp.json` 指向另一个仓库的同一文件（需自行处理路径与权限）。

本仓库的 **增强 Gemini** 脚本在 **`scripts/gemini-mcp-plus/`**，其它项目若要共用，可把 `gemini` 的 `args` 写成 **指向本仓库的绝对路径**，例如：

`d:/AAAFLOW/scripts/gemini-mcp-plus/index.mjs`

（按你本机盘符修改。）

## 4. 与本仓库相关的示例（无密钥）

见 **`docs/cursor-mcp-vibma.example.json`**、**`docs/cursor-mcp-figma.example.json`**；真实密钥只放在 **`.cursor/mcp.json`**（已 `.gitignore`）或 Cursor 用户级 MCP，勿提交 Git。

## 5. 增强 Gemini（生图）必须用本地脚本

不要用不存在的 npm 包 **`@google/gemini-mcp`**。应使用本仓库的 **`scripts/gemini-mcp-plus/index.mjs`**，详见 **`docs/GEMINI_MCP_PLUS.md`**。
