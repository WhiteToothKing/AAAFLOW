# 不用 MCP，直接用 Gemini 官方 API 生图

与 MCP 无关：向 Google **Generative Language API** 发 `generateContent`，并声明 **`responseModalities` 含 `IMAGE`**。官方文档：<https://ai.google.dev/gemini-api/docs/image-generation>

## 1. 准备密钥与模型

在 **`backend/.env`**（或系统环境变量）中设置：

```env
GEMINI_API_KEY=你的_AI_Studio_密钥
GEMINI_MODEL=gemini-3.1-flash-image-preview
```

付费模型（如 Nano Banana 2）需在 Google AI Studio / Cloud 侧 **已开通计费** 且 Key 有权限。

常用图像模型 ID：

- `gemini-3.1-flash-image-preview` — Nano Banana 2（快）
- `gemini-3-pro-image-preview` — Nano Banana Pro（复杂指令、文字）
- `gemini-2.5-flash-image` — 上一代 Flash 图像

## 2. 本仓库自带：命令行（推荐）

依赖：`httpx`（与后端一致，一般已在 venv 里）。

```bash
cd backend
# 已激活 venv 时：
python scripts/gemini_image_cli.py -p "一只简笔画香蕉，白底，无文字" --aspect 1:1 --size 1K
```

默认输出到 **`backend/outputs/gemini_cli_<时间戳>.png`**，也可用 `-o path/to/out.png`。

查看帮助：

```bash
python scripts/gemini_image_cli.py -h
```

脚本与 **`app/services/image_generator.py` 里的 `GeminiGenerator`** 使用同一类 REST 请求（含 `imageConfig` 失败时会自动再试不带 `imageConfig`）。

## 3. 官方 cURL 示例（自行替换 KEY 与文案）

```bash
curl -sS "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents":[{"role":"user","parts":[{"text":"A minimal yellow banana icon, white background"}]}],
    "generationConfig":{
      "responseModalities":["TEXT","IMAGE"],
      "imageConfig":{"aspectRatio":"1:1","imageSize":"1K"}
    }
  }'
```

响应里在 `candidates[0].content.parts[].inlineData.data` 为 **base64 图片**（多为 PNG）。

## 4. 官方 SDK（Python / Node）

Google 文档中的 **`google-genai`（Python）** 与 **`@google/genai`（Node）** 同样调用上述能力，适合集成进你自己的服务。见文档中的 *Python / JavaScript* 小节。

## 5. 在 AAAFLOW 产品里用

后端路由任务到 **`GenerationProvider.GEMINI`** 时，会走 **`GeminiGenerator`**（读 `GEMINI_*`）。确保 `.env` 已配置且网络可访问 `generativelanguage.googleapis.com`。

## 6. 在 Cursor MCP 里用

若已按 **`docs/GEMINI_MCP_PLUS.md`** 配置 **`scripts/gemini-mcp-plus`**，工具 **`gemini_generate_image`** 与上述 CLI/后端 **同一套 REST**；MCP 未单独写密钥时会读 **`backend/.env`**。

## 网络说明

若出现 **超时 / fetch failed / 无法连接**，多为本机访问 Google API 受限，需合规网络或代理；与是否使用 MCP 无关。
