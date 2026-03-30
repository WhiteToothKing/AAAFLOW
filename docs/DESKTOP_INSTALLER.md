# AAAFLOW Windows 桌面安装包

## 前置条件

- Node.js 18+
- 已在 `frontend` 执行过 `npm install`

## 构建

```bash
cd frontend
npm run electron:pack
```

## GitHub 上获取安装包（推荐）

仓库启用 **GitHub Actions** 后：

1. **手动构建**：Actions → **Desktop Windows installer** → Run workflow；完成后在 **Artifacts** 中下载 `aaaflow-windows-*.zip`（内含 `AAAFLOW-Setup-*.exe`）。
2. **发版附件**：推送 **`v` 开头标签**（例如 `v1.0.1`）时，同一工作流会把 exe **上传到该版本的 GitHub Release**，便于对外分发且**不把大文件提交进主分支**。

本地仍需 `npm ci` / `electron:pack` 时，见上文。

## 产物

| 路径 | 说明 |
|------|------|
| `release/AAAFLOW-Setup-1.0.0.exe`（版本随 package.json） | NSIS 安装向导，可选安装目录 |
| `release/win-unpacked/AAAFLOW.exe` | 绿色版，免安装调试 |

安装后：**开始菜单** 与（若启用）**桌面快捷方式** 名称均为 **AAAFLOW**。

## 使用说明

1. 先安装并启动 **Docker Desktop**，配置好 `backend/.env` 与数据库等（见 `AAAFLOW-小白必读.txt`）。
2. 再运行 **AAAFLOW** 客户端；若未检测到后台，请使用启动台或 `AAAFLOW.bat` 拉起 Docker 栈。

## 签名与上架

当前构建**未**配置代码签名。若需 SmartScreen 少拦截，需准备 Windows 证书并在 `package.json` 的 `build.win` 中配置 `certificateFile` / `certificatePassword`（勿把证书提交进 Git）。

## 本机构建失败：winCodeSign / 符号链接

若日志出现 `Cannot create symbolic link` / `客户端没有所需的特权`，是 electron-builder 解压 `winCodeSign` 时需在缓存里创建符号链接。可选：

1. **Windows 设置** → **系统** → **开发者选项** → 打开 **开发人员模式**；或  
2. **以管理员身份**运行终端后再执行 `npm run electron:pack`。

仓库里已将 `build.win.signAndEditExecutable` 设为 `false`，多数环境下可**不再下载**该工具链即可打包；若你自行改回 `true` 并启用 ASAR 完整性写入，则需满足上述权限之一。
