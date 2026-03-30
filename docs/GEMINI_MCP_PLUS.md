# AAAFLOW 增强 Gemini MCP（含原生生图）

本仓库提供 **`scripts/gemini-mcp-plus/`**：在原有 **聊天 / 计 Token / 列模型** 基础上，增加 **`gemini_generate_image`**，调用 Google **Nano Banana** 系列模型（默认 `gemini-3.1-flash-image-preview`），需 **已开通计费的 `GEMINI_API_KEY`**。

## 安装依赖（首次）

```bash
cd scripts/gemini-mcp-plus
npm install
```

## 与 CLI / 后端是否一致？

**是。** `gemini_generate_image` 与 **`backend/scripts/gemini_image_cli.py`**、**`GeminiGenerator`** 使用同一套官方 REST：

- `generateContent` + `responseModalities: ["TEXT","IMAGE"]`
- 先带 **`imageConfig`**（`aspectRatio`、`imageSize`），失败再 **不带 `imageConfig` 重试**
- 默认模型 **`gemini-3.1-flash-image-preview`**
- 单次请求超时默认 **120s**（工具参数 **`timeoutSeconds`** 可调）

## 配置 Cursor `mcp.json`

将原来的 `npx gemini-mcp-server` **替换**为本地脚本（路径按你本机修改，注意 Windows 反斜杠可写成 `\\` 或改用正斜杠 `/`）：

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["D:/AAAFLOW/scripts/gemini-mcp-plus/index.mjs"],
      "env": {
        "GEMINI_API_KEY": "你的密钥"
      }
    }
  }
}
```

**可不写 `env` 里的密钥**：启动时会自动读取项目里的 **`backend/.env`**（与 CLI 同源）；若 `mcp.json` 里已配置 `GEMINI_API_KEY`，则 **以 MCP 配置为准**（不覆盖）。

保存后 **完全重启 Cursor** 或对 `gemini` 执行 Reload，在 MCP 面板确认已连接。

## 工具列表

| 工具 | 说明 |
|------|------|
| `gemini_generate_image` | 文生图；参数：`prompt`（必填），`model`，`aspectRatio`，`imageSize`（512 / 1K / 2K / 4K），`negativePrompt` |
| `gemini_chat_completion` | 与原版类似，多轮对话 |
| `gemini_count_tokens` | 计 Token |
| `gemini_list_models` | 列模型 |

## 模型说明

- **`gemini-3.1-flash-image-preview`**：Nano Banana 2，速度快，适合批量。
- **`gemini-3-pro-image-preview`**：Nano Banana Pro，复杂指令与文字渲染更强。
- **`gemini-2.5-flash-image`**：上一代 Flash 图像模型。

若接口返回 4xx，请检查 AI Studio 中该模型是否对当前 Key 开放、计费是否正常。若带 `imageConfig` 报错，服务端会自动再试一次**不带** `imageConfig` 的请求。

## 与后端 AAAFLOW 的关系

后端 `GeminiGenerator`（`backend/app/services/image_generator.py`）同样使用 `generateContent` + `IMAGE` 模态；MCP 供 **Cursor 里 Agent** 直接出图，与 Web 后端可并行使用同一密钥（请注意配额与费用）。
