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
  TeamOutlined, ControlOutlined, UserOutlined, BellOutlined,
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
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const DesktopAppShell = lazy(() => import('./DesktopAppShell'));
import { figmaShellLayout } from './generated/figmaShellLayout';
import { buildAntDesignTheme, designTokens, brandColors, gradients, shadows, transitions } from './designTokens';
import { getAccessToken, setAccessToken } from './services/authStorage';
import { isAuthDisabled } from './utils/authMode';
import { healthApi } from './services/api';
import { AaaflowHelpDrawer } from './components/AaaflowHelpDrawer';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const { Header, Content, Sider } = Layout;
const shellBorder = `1px solid ${designTokens.antdToken.colorBorder}`;
const { Title, Text } = Typography;

function RouteFallback() {
  const { pathname } = useLocation();
  const fullViewport = pathname === '/login' || pathname === '/bootstrap';
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullViewport ? '100vh' : '45vh',
        width: '100%',
        gap: 16,
      }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>加载中…</Typography.Text>
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
  useKeyboardShortcuts();

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
      base.push(
        { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/audit', icon: <FileSearchOutlined />, label: '审计日志' },
        { key: '/settings', icon: <ControlOutlined />, label: '系统设置' },
      );
    }
    base.push(
      { key: '/profile', icon: <UserOutlined />, label: '个人中心' },
      { key: '/notifications', icon: <BellOutlined />, label: '通知中心' },
      { key: '/design/figma', icon: <LayoutOutlined />, label: '设计对照' },
    );
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
    <>
      <style>{`
        .aaaflow-sider .ant-menu-item-selected {
          background: ${gradients.siderActive} !important;
          border-right: 2.5px solid ${brandColors.primary};
        }
        .aaaflow-sider .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background: ${brandColors.gray50} !important;
        }
        .aaaflow-sider .ant-menu-item {
          transition: ${transitions.normal};
          border-right: 2.5px solid transparent;
        }
        .aaaflow-header-btn:hover {
          color: ${brandColors.primary} !important;
          background: ${brandColors.primaryBg} !important;
        }
      `}</style>
      <Layout style={{ minHeight: '100vh', background: figmaShellLayout.shellBackground }}>
        <Sider
          width={figmaShellLayout.siderWidth}
          className="aaaflow-sider"
          style={{
            background: '#fff',
            borderRight: shellBorder,
            boxShadow: '1px 0 4px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              padding: '18px 20px',
              borderBottom: shellBorder,
              minHeight: 60,
              display: 'flex',
              alignItems: 'center',
              background: gradients.headerGlow,
            }}
          >
            <Space align="center" size={10}>
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="AAAFLOW"
                width={30}
                height={30}
                style={{ borderRadius: token.borderRadiusSM, display: 'block', boxShadow: shadows.xs }}
              />
              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0, lineHeight: 1.25, letterSpacing: '-0.01em' }} className="text-gradient-brand">
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
            style={{ border: 'none', padding: '10px 8px' }}
          />
          {/* Sidebar footer - user info */}
          {user && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '14px 16px', borderTop: shellBorder,
              background: brandColors.gray50,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: gradients.primaryBtn, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                }}>
                  {(user.full_name || user.username || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: brandColors.gray900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name || user.username}
                  </div>
                  <div style={{ fontSize: 11, color: brandColors.gray400 }}>
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Sider>
        <Layout>
          <Header
            style={{
              height: figmaShellLayout.headerHeight,
              lineHeight: `${figmaShellLayout.headerHeight}px`,
              background: '#fff',
              padding: '0 24px',
              borderBottom: shellBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <Space size="middle" wrap align="center">
              <Badge
                status={backendOk === null ? 'default' : backendOk ? 'success' : 'error'}
                text={
                  <span style={{ fontSize: 13, color: brandColors.gray500 }}>
                    {backendOk === null
                      ? '检查连接…'
                      : backendOk
                        ? '已连接后台'
                        : '未连上后台'}
                  </span>
                }
              />
            </Space>
            <Space wrap size={4}>
              <Button type="text" className="aaaflow-header-btn" icon={<BellOutlined />} onClick={() => navigate('/notifications')} style={{ borderRadius: 8 }} />
              <Button type="text" className="aaaflow-header-btn" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} style={{ borderRadius: 8 }}>
                帮助
              </Button>
              <Button type="text" className="aaaflow-header-btn" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} style={{ borderRadius: 8 }}>
                设置
              </Button>
              <Button type="text" className="aaaflow-header-btn" icon={<LogoutOutlined />} onClick={logout} style={{ borderRadius: 8 }}>
                退出
              </Button>
            </Space>
          </Header>
          <Content
            key={location.pathname}
            className="page-transition-subtle"
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
    </>
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
    <Route path="/users" element={<UserManagement />} />
    <Route path="/audit" element={<AuditLogs />} />
    <Route path="/settings" element={<SystemSettings />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/notifications" element={<NotificationCenter />} />
    <Route path="/design/figma" element={<FigmaDesignReference />} />
    <Route path="/error/:code?" element={<ErrorPage />} />
    <Route path="*" element={<ErrorPage />} />
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
    <Route path="/users" element={<UserManagement />} />
    <Route path="/audit" element={<AuditLogs />} />
    <Route path="/settings" element={<SystemSettings />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/notifications" element={<NotificationCenter />} />
    <Route path="/design/figma" element={<FigmaDesignReference />} />
    <Route path="/error/:code?" element={<ErrorPage />} />
    <Route path="*" element={<ErrorPage />} />
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
