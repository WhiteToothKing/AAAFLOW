# AAAFLOW 私有化部署指南

## 前置条件

- Docker Desktop (Windows/Mac) 或 docker + docker compose (Linux)
- 至少一个 AI API Key：`ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY`

## 部署步骤

### 1. 克隆仓库

git clone https://github.com/WhiteToothKing/AAAFLOW.git
cd AAAFLOW

### 2. 配置环境变量

cp backend/.env.example backend/.env

编辑 `backend/.env`，至少填写：

- `ANTHROPIC_API_KEY` — Claude 对话与需求分析
- `OPENAI_API_KEY` — DALL-E 生图 + GPT 对话
- `JWT_SECRET_KEY` — 生产环境至少 32 字符随机字符串

可选：
- `GEMINI_API_KEY` — Google Gemini 生图
- `JIMENG_ACCESS_KEY` / `JIMENG_SECRET_KEY` — 即梦生图
- `MINIMAX_API_KEY` — MiniMax 生图
- `COMFYUI_API_URL` — 本地或云端 ComfyUI 地址

### 3. 创建首个管理员

设置 `SETUP_TOKEN` 后启动服务：

docker compose up --build -d

调用 setup 接口：

curl -X POST http://localhost:8000/api/auth/setup \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: <你的SETUP_TOKEN>" \
  -d '{"username":"admin","email":"admin@example.com","password":"your-password"}'

### 4. 生产加固

在 `backend/.env` 中设置：

PRODUCTION_MODE=true
CORS_ALLOW_ALL=false
CORS_ORIGINS=https://your-domain.com
AUTH_DISABLED=false
EXPOSE_OPENAPI=false

### 5. 访问

- 前端：http://localhost:3000
- API 文档：http://localhost:8000/docs（生产建议关闭）

## 桌面客户端

参见 [DESKTOP_INSTALLER.md](DESKTOP_INSTALLER.md) 和 [WHERE_TO_DOWNLOAD_EXE.md](WHERE_TO_DOWNLOAD_EXE.md)。
