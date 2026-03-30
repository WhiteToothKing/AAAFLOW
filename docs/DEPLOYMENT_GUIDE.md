# AAAFLOW 部署指南

## 部署方式一览

| 方式 | 适用场景 | 难度 |
|------|----------|------|
| Docker Compose (开发) | 本地开发 / 快速体验 | 低 |
| Docker Compose (生产) | 团队内网 / 小规模生产 | 中 |
| Windows 桌面客户端 | 终端用户使用 | 低 |

---

## 1. Docker Compose 开发部署

### 前提条件

- Docker Desktop（Windows / macOS）或 Docker Engine（Linux）
- Git

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/WhiteToothKing/AAAFLOW.git
cd AAAFLOW

# 2. 复制并配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少设置 ANTHROPIC_API_KEY

# 3. 启动服务
docker compose up -d --build

# 4. 等待所有服务健康
docker compose ps

# 5. 访问
# 前端：http://localhost:3000
# 后端 API：http://localhost:8000/api
# API 文档：http://localhost:8000/docs
```

### 创建首个管理员

```bash
curl -X POST http://localhost:8000/api/auth/setup \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: your-setup-token" \
  -d '{"username":"admin","password":"your-password","email":"admin@example.com"}'
```

---

## 2. Docker Compose 生产部署

### 前提条件

- Docker Compose v2.x
- 域名（可选，用于 TLS）
- SSL 证书（可选）

### 步骤

```bash
# 1. 配置环境变量
cp backend/.env.example backend/.env
# 编辑设置生产环境参数

# 2. 设置生产变量
export POSTGRES_PASSWORD=your-strong-password
export REDIS_PASSWORD=your-redis-password
export BACKEND_WORKERS=4
export LOG_LEVEL=warning

# 3. 启动生产环境
docker compose -f docker-compose.prod.yml up -d --build

# 4. 验证
curl http://localhost/api/health
```

### Nginx TLS 配置

1. 将 SSL 证书放入 `nginx/ssl/` 目录：
   - `cert.pem` — 证书文件
   - `key.pem` — 私钥文件

2. 取消注释 `nginx/conf.d/default.conf` 中的 TLS server 块

3. 重启 Nginx：
   ```bash
   docker compose -f docker-compose.prod.yml restart nginx
   ```

### 数据库备份

```bash
# 手动备份
docker compose -f docker-compose.prod.yml --profile backup run --rm backup

# 定时备份（Linux crontab）
0 2 * * * cd /path/to/AAAFLOW && docker compose -f docker-compose.prod.yml --profile backup run --rm backup
```

### 监控

- **健康检查**：`GET /api/health`（基础）、`GET /api/health/detailed`（详细，含 DB/Redis/ComfyUI）
- **Prometheus 指标**：`GET /api/metrics`
- **Nginx 日志**：映射到 `nginx_logs` 卷

---

## 3. Windows 桌面客户端

### 构建安装包

```bash
cd frontend
npm ci
npm run electron:build
# 输出在 frontend/release/ 目录
```

产物包括：
- `AAAFLOW-Setup-{version}.exe` — NSIS 安装包
- `AAAFLOW-Portable-{version}.exe` — 免安装便携版

### 自动更新

桌面客户端通过 GitHub Release 检测更新。推送 `v*` 标签会触发 CI 自动构建并发布。

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## 环境变量参考

### 后端（`backend/.env`）

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `REDIS_URL` | 是 | Redis 连接串 |
| `JWT_SECRET_KEY` | 是 | JWT 签名密钥 |
| `SETUP_TOKEN` | 推荐 | 首次创建管理员的令牌 |
| `ANTHROPIC_API_KEY` | 推荐 | Claude API 密钥 |
| `OPENAI_API_KEY` | 可选 | OpenAI / DALL-E 密钥 |
| `GEMINI_API_KEY` | 可选 | Google Gemini 密钥 |
| `MIDJOURNEY_API_URL` | 可选 | Midjourney 代理地址 |
| `JIMENG_API_KEY` | 可选 | 即梦 API 密钥 |
| `MINIMAX_API_KEY` | 可选 | MiniMax 密钥 |
| `BANANA_API_KEY` | 可选 | Banana Pro 密钥 |
| `COMFYUI_API_URL` | 可选 | ComfyUI 服务地址 |

### 前端（构建时）

| 变量 | 说明 |
|------|------|
| `VITE_API_URL` | 后端 API 地址 |
| `VITE_APP_VERSION` | 显示版本号 |
| `VITE_DESKTOP_BUILD` | 桌面构建标识 |

---

## 故障排查

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 后端无法启动 | `.env` 缺少必要变量 | 检查 DATABASE_URL 和 REDIS_URL |
| 数据库迁移失败 | 数据库未就绪 | 等待 PostgreSQL healthy 后重试 |
| 前端白屏 | API 地址不对 | 检查 VITE_API_URL 或登录页 API 设置 |
| 图片生成失败 | API Key 未配置 | 在 `.env` 中添加对应提供方密钥 |
| ComfyUI 不可用 | 服务未启动 | 确认 COMFYUI_API_URL 可访问 |
