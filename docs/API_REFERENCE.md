# AAAFLOW API 参考文档

> 完整交互式文档请访问：`http://your-server:8000/docs` (Swagger UI) 或 `/redoc` (ReDoc)

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: JWT Bearer Token（`Authorization: Bearer <token>`）
- **数据格式**: JSON

---

## 认证 `/api/auth`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录，返回 JWT | 公开 |
| POST | `/auth/setup` | 首次创建管理员 | X-Setup-Token |
| GET | `/auth/me` | 获取当前用户信息 | 登录用户 |

## 任务 `/api/tasks`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/tasks` | 创建美术生成任务 | 非只读 |
| GET | `/tasks` | 分页查询任务列表 | 登录用户 |
| GET | `/tasks/{id}` | 获取任务详情 | 登录用户 |
| PATCH | `/tasks/{id}` | 更新任务 | 非只读 |
| DELETE | `/tasks/{id}` | 删除任务 | 非只读 |
| POST | `/tasks/{id}/regenerate` | 重新生成 | 非只读 |
| POST | `/tasks/{id}/results/{rid}/feedback` | 提交评分反馈 | 非只读 |

## 工作流 `/api/workflows`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/workflows` | 查询工作流列表 | 登录用户 |
| POST | `/workflows` | 创建工作流 | 管理员 |
| GET | `/workflows/{id}` | 获取工作流详情 | 登录用户 |
| PATCH | `/workflows/{id}` | 更新工作流 | 管理员 |
| DELETE | `/workflows/{id}` | 删除工作流 | 管理员 |

## AI 分析 `/api/analyze`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/analyze` | 分析需求（类型/风格/复杂度） | 登录用户 |
| GET | `/analyze/providers` | 获取可用生成服务列表 | 登录用户 |

## 对话 `/api/chat`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/chat/llm-options` | 获取可用 LLM 模型 | 登录用户 |
| POST | `/chat/sessions` | 创建对话会话 | 非只读 |
| GET | `/chat/sessions` | 查询会话列表 | 登录用户 |
| GET | `/chat/sessions/{id}` | 获取会话详情 | 登录用户 |
| DELETE | `/chat/sessions/{id}` | 删除会话 | 非只读 |
| POST | `/chat/sessions/{id}/messages` | 发送消息（SSE 流式） | 非只读 |
| GET | `/chat/skills` | 获取可用技能列表 | 登录用户 |

## 用户管理 `/api/users`（管理员）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/users` | 分页查询用户 | 管理员 |
| POST | `/users` | 创建用户 | 管理员 |
| GET | `/users/{id}` | 获取用户信息 | 管理员 |
| PATCH | `/users/{id}` | 更新用户 | 管理员 |
| DELETE | `/users/{id}` | 停用用户 | 管理员 |
| GET | `/users/me/profile` | 获取自己的资料 | 登录用户 |

## 审计日志 `/api/audit`（管理员）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/audit` | 分页查询审计日志 | 管理员 |

## 系统 `/api/system`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/system/stats` | 系统统计数据 | 登录用户 |
| GET | `/system/config` | 系统配置（脱敏） | 管理员 |

## 健康检查 `/api/health`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/health` | 基础健康检查 | 公开 |
| GET | `/health/detailed` | 详细健康检查（含 DB/Redis/ComfyUI） | 公开 |

## 监控 `/api/metrics`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/metrics` | Prometheus 格式指标 | 公开 |

## WebSocket `/api/ws`

| 路径 | 说明 |
|------|------|
| `ws://host/api/ws/tasks` | 实时任务状态推送 |

客户端连接后自动接收 `task_status` 事件。发送 `"ping"` 可接收 `{"event": "pong"}` 心跳响应。

## 文件上传 `/api/upload`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/upload` | 上传文件（multipart） | 登录用户 |

## 错误响应

所有错误返回统一格式：

```json
{
  "detail": "错误描述"
}
```

常见状态码：
- `401` — 未认证或 Token 过期
- `403` — 权限不足
- `404` — 资源不存在
- `422` — 请求参数校验失败
- `500` — 服务器内部错误
