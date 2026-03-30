import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import {
  ConfigProvider, Layout, Menu, theme as antdTheme, Typography, Space, Button, Badge, Spin,
} from 'antd';
import {
  DashboardOutlined, PlusCircleOutlined,
  UnorderedListOutlined, ThunderboltOutlined,
  MessageOutlined, LogoutOutlined, QuestionCircleOutlined, SettingOutlined,
  FileSearchOutlined, LayoutOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const DemandWizard = lazy(() => import('./pages/DemandWizard'));
const TaskList = lazy(() => import('./pages/TaskList'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const WorkflowList = lazy(() => import('./pages/WorkflowList'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const ChatWorkspace = lazy(() => import('./pages/ChatWorkspace'));
const FigmaDesignReference = lazy(() => import('./pages/FigmaDesignReference'));
const Login = lazy(() => import('./pages/Login'));
const DesktopBootstrap = lazy(() => import('./pages/DesktopBootstrap'));
const DesktopAppShell = lazy(() => import('./DesktopAppShell'));
import { figmaShellLayout } from './generated/figmaShellLayout';
import { buildAntDesignTheme, designTokens } from './designTokens';
import { getAccessToken, setAccessToken } from './services/authStorage';
import { isAuthDisabled } from './utils/authMode';
import { healthApi } from './services/api';
import { AaaflowHelpDrawer } from './components/AaaflowHelpDrawer';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';

const { Header, Content, Sider } = Layout;
const shellBorder = `1px solid ${designTokens.antdToken.colorBorder}`;
const { Title, Text } = Typography;

function RouteFallback() {
  const { pathname } = useLocation();
  const fullViewport = pathname === '/login' || pathname === '/bootstrap';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullViewport ? '100vh' : '45vh',
        width: '100%',
      }}
    >
      <Spin size="large" />
    </div>
  );
}
const { useToken } = antdTheme;

function isDesktopShellMode(): boolean {
  if (typeof window === 'undefined') return false;
  const packaged =
    import.meta.env.VITE_DESKTOP_BUILD === 'true' &&
    window.location.protocol === 'file:';
  const devDesktop =
    new URLSearchParams(window.location.search).get('desktop') === '1';
  return packaged || devDesktop;
}

function RequireAuth() {
  const location = useLocation();
  if (isAuthDisabled()) {
    return <Outlet />;
  }
  if (!getAccessToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useToken();
  const { user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const ping = useCallback(async () => {
    try {
      await healthApi.check();
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    const kick = window.setTimeout(() => {
      void ping();
    }, 0);
    const t = window.setInterval(ping, 30_000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(t);
    };
  }, [ping]);

  const menuItems = useMemo(() => {
    const base = [
      { key: '/', icon: <DashboardOutlined />, label: '工作台' },
      { key: '/chat', icon: <MessageOutlined />, label: 'AI 对话' },
      { key: '/create', icon: <PlusCircleOutlined />, label: '提交需求' },
      { key: '/wizard', icon: <ScheduleOutlined />, label: '需求向导' },
      { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务列表' },
      { key: '/workflows', icon: <ThunderboltOutlined />, label: '工作流' },
    ];
    if (user?.role === 'admin') {
      base.push({ key: '/audit', icon: <FileSearchOutlined />, label: '审计日志' });
    }
    base.push({ key: '/design/figma', icon: <LayoutOutlined />, label: '设计对照' });
    return base;
  }, [user?.role]);

  const selectedKey = menuItems.find((item) =>
    location.pathname === item.key ||
    (item.key !== '/' && location.pathname.startsWith(item.key))
  )?.key || '/';

  const logout = () => {
    setAccessToken(null);
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: figmaShellLayout.shellBackground }}>
      <Sider
        width={figmaShellLayout.siderWidth}
        style={{
          background: figmaShellLayout.siderBackground,
          borderRight: shellBorder,
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: shellBorder,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Space align="center" size={10}>
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="AAAFLOW"
              width={28}
              height={28}
              style={{ borderRadius: token.borderRadiusSM, display: 'block' }}
            />
            <div style={{ minWidth: 0 }}>
              <Title level={5} style={{ margin: 0, lineHeight: 1.25 }}>
                AAAFLOW
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>
                游戏美术智能体
              </Text>
            </div>
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', padding: '8px 12px' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            height: figmaShellLayout.headerHeight,
            lineHeight: `${figmaShellLayout.headerHeight}px`,
            background: figmaShellLayout.headerBackground,
            padding: '0 24px',
            borderBottom: shellBorder,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size="middle" wrap align="center">
            <Badge
              status={backendOk === null ? 'default' : backendOk ? 'success' : 'error'}
              text={
                backendOk === null
                  ? '检查连接…'
                  : backendOk
                    ? '已连接后台'
                    : '未连上后台'
              }
            />
          </Space>
          <Space wrap>
            <Button type="text" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)}>
              使用说明
            </Button>
            <Button type="text" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              设置
            </Button>
            <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            padding: location.pathname.startsWith('/chat') ? 0 : 24,
            background: figmaShellLayout.contentAreaBackground,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <AaaflowHelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConnectionSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}

const desktopChildRoutes = (
  <>
    <Route path="/" element={<Dashboard />} />
    <Route path="/chat" element={<ChatWorkspace embeddedDesktop />} />
    <Route path="/create" element={<TaskCreate />} />
    <Route path="/wizard" element={<DemandWizard />} />
    <Route path="/tasks" element={<TaskList />} />
    <Route path="/tasks/:id" element={<TaskDetail />} />
    <Route path="/workflows" element={<WorkflowList />} />
    <Route path="/audit" element={<AuditLogs />} />
    <Route path="/design/figma" element={<FigmaDesignReference />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

const webChildRoutes = (
  <>
    <Route path="/" element={<Dashboard />} />
    <Route path="/chat" element={<ChatWorkspace />} />
    <Route path="/create" element={<TaskCreate />} />
    <Route path="/wizard" element={<DemandWizard />} />
    <Route path="/tasks" element={<TaskList />} />
    <Route path="/tasks/:id" element={<TaskDetail />} />
    <Route path="/workflows" element={<WorkflowList />} />
    <Route path="/audit" element={<AuditLogs />} />
    <Route path="/design/figma" element={<FigmaDesignReference />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

export default function App() {
  const desktop = isDesktopShellMode();

  return (
    <ConfigProvider
      locale={zhCN}
      theme={buildAntDesignTheme()}
    >
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/bootstrap" element={<DesktopBootstrap />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            {desktop ? (
              <Route element={<DesktopAppShell />}>{desktopChildRoutes}</Route>
            ) : (
              <Route element={<AppLayout />}>{webChildRoutes}</Route>
            )}
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </ConfigProvider>
  );
}
