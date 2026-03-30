# Windows 安装包（exe）在哪里拿？

## 重要说明

- **Git 主仓库里不会提交 `*.exe`**（体积大、不利协作），`frontend/release/` 在 `.gitignore` 中。
- **GUI 源码在仓库里**：`frontend/src` + Electron `frontend/electron`，clone 后本地 `npm run dev` / 打包即可看到界面。

## 在 GitHub 上下载 exe（推荐）

1. 将本仓库 **push** 到 GitHub（需包含 `.github/workflows/desktop-windows.yml`）。
2. 打开 **Actions** → **Desktop Windows installer**：
   - 点 **Run workflow** 手动跑一次；或  
   - 推送 **`v*` 标签**（如 `v1.0.0`）自动构建并挂到 **Releases**。
3. 在对应 **Workflow 运行页** 底部 **Artifacts** 下载 `aaaflow-windows-*.zip`，解压得到 **`AAAFLOW-Setup-*.exe`**。

打标签时，同一工作流会把 exe **上传到该版本的 Release**，便于对外链接。

## 本机打包

```bash
cd frontend
npm ci
npm run electron:pack
```

产物：`frontend/release/AAAFLOW-Setup-<version>.exe`（仍勿提交 Git）。
