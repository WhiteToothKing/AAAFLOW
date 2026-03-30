# AAAFLOW — Game Art AI Agent System

游戏美术外包AI智能体系统 — 通过AI分析需求、智能路由、自动生成游戏美术资源。

## Architecture

```
┌──────────────┐     ┌─────────────────────────────────────────────┐
│   Frontend   │────▶│               Backend (FastAPI)             │
│  React + TS  │     │                                             │
│  Ant Design  │     │  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
└──────────────┘     │  │  Claude    │  │  Router  │  │  Result  │ │
                     │  │  Analyzer  │─▶│  Engine  │─▶│  Manager │ │
                     │  └───────────┘  └────┬─────┘  └──────────┘ │
                     │                      │                      │
                     │         ┌────────────┼────────────┐         │
                     │         ▼            ▼            ▼         │
                     │    ┌─────────┐ ┌──────────┐ ┌──────────┐   │
                     │    │ DALL-E  │ │Midjourney│ │ ComfyUI  │   │
                     │    │  API    │ │  Proxy   │ │ Workflow │   │
                     │    └─────────┘ └──────────┘ └──────────┘   │
                     └─────────────────────────────────────────────┘
                            │                            │
                     ┌──────┴──────┐              ┌──────┴──────┐
                     │ PostgreSQL  │              │    Redis     │
                     └─────────────┘              └─────────────┘
```

## Features

- **AI Requirement Analysis**: Submit art requirements in natural language; Claude analyzes type, style, complexity
- **Intelligent Routing**: Automatically selects the best generation pipeline (DALL-E / Midjourney / ComfyUI)
- **Dual Generation Mode**: API-based (DALL-E, Midjourney) or workflow-based (ComfyUI)
- **Iterative Refinement**: Provide feedback on results → AI refines prompts → regenerate
- **Result Management**: Rate, select, and track history of all generated assets

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite + Ant Design         |
| Backend  | FastAPI + SQLAlchemy (async) + Alembic             |
| Database | PostgreSQL 16 + Redis 7                           |
| AI       | Anthropic Claude API + OpenAI DALL-E + ComfyUI    |
| Infra    | Docker Compose                                    |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- API keys: configure at least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for **AI 对话** (optional: `OPENAI_CHAT_MODEL`, `DEFAULT_LLM_PROVIDER` in `backend/.env`). Use **设置** in the desktop shell or **Web** header (same modal as desktop), or the in-chat model pickers, for the default provider/model on **new** sessions; each session keeps its original provider.

### 1. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000（首次需登录；API 根地址在登录页或登录后顶部「设置」；管理员用 `SETUP_TOKEN` 调 `POST /api/auth/setup` 创建首个账号，详见 [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md)）
- Backend API: http://localhost:8000/docs（生产可设 `EXPOSE_OPENAPI=false` 关闭）
- API Docs (ReDoc): http://localhost:8000/redoc

### 3. Local Development

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# 可选：跑门禁里的单元测试
pip install -r requirements-dev.txt && pytest
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### 4. Windows desktop client (chat-first)

The desktop app is an **Electron** window focused on **talking to the AI**. You still need the **backend running** (Docker + `backend/.env`, e.g. double-click `AAAFLOW.bat` or `启动AAAFLOW.bat` in the repo root). See `AAAFLOW-小白必读.txt` for a non-technical walkthrough in Chinese.

```bash
cd frontend
npm install
npm run build:desktop
npm run electron:pack
```

- **Installer:** `frontend/release/AAAFLOW-Setup-<version>.exe` (NSIS, desktop + Start Menu shortcuts). Details: `docs/DESKTOP_INSTALLER.md`.
- **从 Git 获取 exe（不经主分支提交大文件）：** 使用 GitHub Actions **Desktop Windows installer**（手动运行或打 `v*` 标签触发）；产物在 **Artifacts**，打标签时同时挂到 **Releases**。步骤见 **`docs/WHERE_TO_DOWNLOAD_EXE.md`**。客户端启动后台页为与 Figma/Ant Design 一致的 **`#/bootstrap`**，不再使用旧版深色 HTML 启动台。
- **Figma UI spec / Vibma wireframe notes:** `docs/FIGMA_DESKTOP_UI.md`.
- **Figma → 客户端自动同步（PNG + 壳层布局常量）：** `docs/FIGMA_TO_APP_PIPELINE.md`；配置根目录 `.env` 后在 `frontend` 执行 `npm run figma:sync`。
- **设计稿与界面一致性预期：** `docs/DESIGN_PARITY.md`。
- **Development:** `npm run electron:dev` (Vite on port 3000 + Electron).

## API Endpoints

| Method | Endpoint                                    | Description           |
| ------ | ------------------------------------------- | --------------------- |
| POST   | `/api/tasks`                                | Create art task       |
| GET    | `/api/tasks`                                | List tasks            |
| GET    | `/api/tasks/{id}`                           | Get task detail       |
| PATCH  | `/api/tasks/{id}`                           | Update task           |
| DELETE | `/api/tasks/{id}`                           | Delete task           |
| POST   | `/api/tasks/{id}/regenerate`                | Regenerate with feedback |
| POST   | `/api/tasks/{id}/results/{rid}/feedback`    | Submit result feedback |
| POST   | `/api/upload`                               | Upload reference image |
| GET    | `/api/workflows`                            | List ComfyUI workflows |
| POST   | `/api/workflows`                            | Create workflow       |
| GET    | `/api/health`                               | Health check          |

## Database Schema

**Core Tables:**

- `users` — System users with roles
- `art_tasks` — Art generation tasks with full lifecycle tracking
- `generation_results` — Generated images with ratings and selection
- `comfyui_workflows` — Stored ComfyUI workflow templates

## Agent Pipeline

1. **Receive** → User submits requirement (title + description + reference images)
2. **Analyze** → Claude API analyzes: art type, style, complexity, recommended approach
3. **Route** → Engine selects provider based on analysis (DALL-E for simple, ComfyUI for complex)
4. **Generate** → Dispatches to selected provider with optimized prompt
5. **Review** → User reviews results, provides feedback
6. **Iterate** → Optional: refine prompt based on feedback and regenerate

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── core/         # Config, database, Redis
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic
│   │   │   ├── agent_orchestrator.py   # Central pipeline coordinator
│   │   │   ├── claude_analyzer.py      # Claude AI analysis
│   │   │   ├── image_generator.py      # DALL-E / Midjourney
│   │   │   └── comfyui_service.py      # ComfyUI integration
│   │   └── main.py       # FastAPI app entry
│   ├── alembic/          # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, TaskCreate, TaskList, TaskDetail, WorkflowList
│   │   ├── services/     # API client
│   │   ├── stores/       # Zustand state management
│   │   └── types/        # TypeScript type definitions
│   └── package.json
└── docker-compose.yml
```
