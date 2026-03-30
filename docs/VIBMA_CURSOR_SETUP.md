# Vibma（Figma 插件）+ Cursor 连接说明

你截图里 **PORT 3055**、**CHANNEL `vibma`**、**Connected / Waiting for MCP connection** 表示：**插件已连上本机隧道**，正在等 **Cursor 里的 Vibma MCP 进程** 通过同一端口、同一频道「报到」。

我（当前对话里的 AI）**不能直接替你连上 Vibma**：是否连通取决于 **你电脑上的** `vibma-tunnel` + **Cursor → MCP** 配置。按下面做即可闭环。

## 1. 保持隧道运行（必须）

在项目外任意终端执行（窗口不要关）：

```bash
npx @ufira/vibma-tunnel
```

看到类似 **`WebSocket server running on port 3055`** 即正常。  
若 3055 被占用，可用 `VIBMA_PORT=3056 npx @ufira/vibma-tunnel`，并在 Figma 插件里把 **PORT** 改成 **3056**。

## 2. 在 Cursor 里添加 Vibma MCP（必须）

官方推荐配置（与频道默认 `vibma`、端口 **3055** 一致）：

打开 **Cursor → Settings → MCP**（或编辑本机 MCP 配置文件，名称因版本可能为 `mcp.json`），增加：

```json
{
  "mcpServers": {
    "Vibma": {
      "command": "npx",
      "args": ["-y", "@ufira/vibma", "--edit", "--port=3055"]
    }
  }
}
```

- **`--edit`**：读写改图层（与插件里安全提示一致）。若只要只读，可去掉 `--edit`（见 [Vibma CARRYME](https://github.com/ufira-ai/Vibma/blob/main/CARRYME.md)）。
- 插件里 **CHANNEL** 填 **`vibma`** 时，一般**不用改 MCP 参数**；若你改了频道名，需在对话里让 Agent 用同一频道调用 `connection`。

**改完 MCP 后请完全重启 Cursor**（stdio 类 MCP 通常不能热更新）。

## 3. 在 Cursor Agent 里验证

新开 Agent 对话，让 AI 执行 Vibma 文档里的握手（大意如下，以你当前 Cursor 里实际工具名为准）：

1. 调用 **`connection`**，`method: "create"`（频道默认 `vibma`）
2. 再调用 **`connection`**，`method: "get"`  
   若返回带 **`pong`** 和 **文档名**，说明 **Figma 插件 ↔ 隧道 ↔ Cursor MCP** 已通。

## 4. 常见问题

| 现象 | 处理 |
|------|------|
| 插件一直 Waiting for MCP | 确认隧道在跑；MCP 已配置且 **端口一致**；**重启 Cursor** |
| 端口不一致 | MCP 的 `--port=3055` 与插件 PORT 必须相同 |
| 工具超时 | 插件未连上隧道，或频道名与 `connection(create)` 不一致 |

更完整的说明与排错见：  
<https://github.com/ufira-ai/Vibma/blob/main/CARRYME.md>  
（中文版：<https://github.com/ufira-ai/Vibma/blob/main/CARRYME.zh-CN.md>）

## 5. 与本仓库（AAAFLOW）一起用

连通后，在对话里贴 **Figma 里当前文件的上下文**，并说明要改 **`frontend/src`** 下哪些页面（如 `DesktopShell.tsx`、`pages/ChatWorkspace.tsx`），让 AI 一边读代码一边用 Vibma 改 Figma 或按稿实现界面。
