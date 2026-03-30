/**
 * AAAFLOW — Electron：Ant Design 启动页（#/bootstrap）+ 主窗口；打包后无需 CMD。
 */
const {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Tray,
  Menu,
  Notification,
  nativeImage,
  globalShortcut,
  screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const isDev =
  process.env.NODE_ENV === 'development' ||
  process.env.ELECTRON_DEV === '1' ||
  !app.isPackaged;

const DEV_URL = 'http://127.0.0.1:3000/?desktop=1';

let mainWin = null;
let launcherWin = null;
let dockerLogTarget = null;
let dockerComposeRunning = false;
let tray = null;
let lastWindowBounds = null;

function augmentDockerPath() {
  const dirs = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Docker', 'Docker', 'resources', 'bin'),
    path.join(process.env.LocalAppData || '', 'Programs', 'Docker', 'Docker', 'resources', 'bin'),
  ];
  const extra = dirs.filter((d) => d && fs.existsSync(path.join(d, 'docker.exe')));
  if (extra.length === 0) return;
  const prefix = extra.join(';');
  process.env.Path = `${prefix};${process.env.Path || ''}`;
}

function findRepoRoot() {
  if (process.env.AAAFLOW_REPO) {
    const r = process.env.AAAFLOW_REPO;
    if (fs.existsSync(path.join(r, 'docker-compose.yml'))) {
      return r;
    }
  }
  if (app.isPackaged) {
    let dir = path.dirname(process.execPath);
    for (let i = 0; i < 12; i++) {
      const compose = path.join(dir, 'docker-compose.yml');
      if (fs.existsSync(compose)) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }
  const devGuess = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(devGuess, 'docker-compose.yml'))) {
    return devGuess;
  }
  return null;
}

function checkBackendOnce() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/health', { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(maxAttempts = 120, intervalMs = 2500) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkBackendOnce()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function sendDockerLog(chunk) {
  const text = chunk.toString();
  if (dockerLogTarget && !dockerLogTarget.isDestroyed()) {
    dockerLogTarget.send('aaaflow:docker-log', text);
  }
}

function createLauncherWindow() {
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.focus();
    return;
  }
  launcherWin = new BrowserWindow({
    width: 880,
    height: 780,
    minWidth: 560,
    minHeight: 520,
    title: 'AAAFLOW — 启动后台',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  dockerLogTarget = launcherWin.webContents;
  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
  if (isDev) {
    launcherWin.loadURL('http://127.0.0.1:3000/#/bootstrap');
  } else {
    launcherWin.loadFile(indexHtml, { hash: '/bootstrap' });
  }
  launcherWin.on('closed', () => {
    launcherWin = null;
    dockerLogTarget = null;
  });
}

function createMainWindow() {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'AAAFLOW',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (lastWindowBounds) {
    win.setBounds(lastWindowBounds);
  }

  win.on('close', () => {
    if (!win.isDestroyed()) {
      lastWindowBounds = win.getBounds();
    }
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexHtml, { hash: '/' });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWin = win;
  win.on('closed', () => {
    mainWin = null;
  });
}

async function openMainAndCloseLauncher() {
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.close();
    launcherWin = null;
  }
  createMainWindow();
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '..', 'public', 'logo.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('AAAFLOW');
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主窗口', click: () => { if (mainWin && !mainWin.isDestroyed()) mainWin.show(); else createMainWindow(); } },
    { type: 'separator' },
    { label: '退出', click: () => { app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      if (mainWin.isVisible()) mainWin.focus();
      else mainWin.show();
    } else {
      createMainWindow();
    }
  });
}

function registerIpc() {
  ipcMain.handle('aaaflow:getRepoRoot', async () => {
    const root = findRepoRoot();
    if (root) return { ok: true, path: root };
    return {
      ok: false,
      message:
        '未找到 docker-compose.yml。请保留完整解压目录；exe 位于 frontend\\release\\win-unpacked 时，向上能找到项目根目录。',
    };
  });

  ipcMain.handle('aaaflow:checkHealth', async () => checkBackendOnce());

  ipcMain.handle('aaaflow:try-open-main', async () => {
    if (await checkBackendOnce()) {
      await openMainAndCloseLauncher();
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle('aaaflow:ensureEnv', async () => {
    const repo = findRepoRoot();
    if (!repo) return { ok: false };
    const envFile = path.join(repo, 'backend', '.env');
    const example = path.join(repo, 'backend', '.env.example');
    if (!fs.existsSync(envFile) && fs.existsSync(example)) {
      fs.copyFileSync(example, envFile);
      spawn('notepad.exe', [envFile], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true, openedNotepad: true };
    }
    return { ok: true, openedNotepad: false };
  });

  ipcMain.handle('aaaflow:open-env', async () => {
    const repo = findRepoRoot();
    if (!repo) return { ok: false };
    const envFile = path.join(repo, 'backend', '.env');
    if (fs.existsSync(envFile)) {
      spawn('notepad.exe', [envFile], { detached: true, stdio: 'ignore' }).unref();
    } else {
      await shell.openPath(path.join(repo, 'backend'));
    }
    return { ok: true };
  });

  ipcMain.handle('aaaflow:open-repo', async () => {
    const repo = findRepoRoot();
    if (repo) await shell.openPath(repo);
    return { ok: !!repo };
  });

  ipcMain.handle('aaaflow:open-mirror-help', async () => {
    const repo = findRepoRoot();
    const doc = repo ? path.join(repo, 'AAAFLOW-小白必读.txt') : null;
    if (doc && fs.existsSync(doc)) {
      await shell.openPath(doc);
    } else {
      await shell.openExternal('https://docs.docker.com/desktop/settings/windows/#docker-engine');
    }
    return { ok: true };
  });

  ipcMain.on('aaaflow:start-docker', () => {
    if (dockerComposeRunning) {
      sendDockerLog('\n已有 docker compose 在运行，请等待结束。\n');
      return;
    }
    const repo = findRepoRoot();
    if (!repo) {
      sendDockerLog('错误：找不到项目根目录（docker-compose.yml）。\n');
      if (launcherWin && !launcherWin.isDestroyed()) {
        launcherWin.webContents.send('aaaflow:docker-done', 1);
      }
      return;
    }

    dockerComposeRunning = true;
    augmentDockerPath();
    dockerLogTarget = launcherWin && !launcherWin.isDestroyed() ? launcherWin.webContents : null;

    sendDockerLog(`工作目录: ${repo}\n执行: docker compose up -d --build\n\n`);

    const child = spawn('docker', ['compose', 'up', '-d', '--build'], {
      cwd: repo,
      env: process.env,
      shell: false,
    });

    child.stdout.on('data', sendDockerLog);
    child.stderr.on('data', sendDockerLog);
    child.on('error', (err) => {
      dockerComposeRunning = false;
      sendDockerLog(`\n启动 docker 失败: ${err.message}\n请确认已安装 Docker Desktop 并已运行。\n`);
      if (launcherWin && !launcherWin.isDestroyed()) {
        launcherWin.webContents.send('aaaflow:docker-done', 1);
      }
    });
    child.on('close', async (code) => {
      dockerComposeRunning = false;
      if (launcherWin && !launcherWin.isDestroyed()) {
        launcherWin.webContents.send('aaaflow:docker-done', code ?? 0);
      }
      if (code === 0) {
        sendDockerLog('\n等待后端 http://127.0.0.1:8000/api/health …\n');
        const ok = await waitForBackend();
        if (ok) {
          await openMainAndCloseLauncher();
        } else {
          sendDockerLog('\n后端在超时时间内未响应。可点击「检测后端是否已就绪」重试，或查看 Docker Desktop 容器日志。\n');
        }
      }
    });
  });

  ipcMain.on('aaaflow:notify-generation-done', (_event, title, body) => {
    if (Notification.isSupported()) {
      const n = new Notification({ title: title || 'AAAFLOW', body: body || '图片生成完成' });
      n.on('click', () => {
        if (mainWin && !mainWin.isDestroyed()) mainWin.show();
      });
      n.show();
    }
  });
}

async function bootstrap() {
  registerIpc();

  createTray();

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (tray) { tray.destroy(); tray = null; }
  });

  if (isDev) {
    if (process.env.AAAFLOW_BOOTSTRAP === '1') {
      createLauncherWindow();
    } else {
      createMainWindow();
    }
    return;
  }

  if (await checkBackendOnce()) {
    createMainWindow();
    return;
  }

  createLauncherWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin && !mainWin.isDestroyed()) mainWin.focus();
    else if (launcherWin && !launcherWin.isDestroyed()) launcherWin.focus();
  });

  app.whenReady().then(() => bootstrap());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDev) createMainWindow();
      else {
        checkBackendOnce().then((ok) => {
          if (ok) createMainWindow();
          else createLauncherWindow();
        });
      }
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
