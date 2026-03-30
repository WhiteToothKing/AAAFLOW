import type React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Button, Space, Typography, Badge, theme,
} from 'antd';
import {
  QuestionCircleOutlined, SettingOutlined, PlusOutlined, HistoryOutlined,
  DashboardOutlined, MessageOutlined, PlusCircleOutlined, UnorderedListOutlined,
  ThunderboltOutlined, FileSearchOutlined, LayoutOutlined, ScheduleOutlined,
  TeamOutlined, ControlOutlined, UserOutlined, BellOutlined,
  MinusOutlined, BorderOutlined, BlockOutlined, CloseOutlined,
} from '@ant-design/icons';

import { healthApi } from './services/api';
import { useAuth } from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AaaflowHelpDrawer } from './components/AaaflowHelpDrawer';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { figmaShellLayout } from './generated/figmaShellLayout';
import { designTokens, brandColors, gradients, shadows, transitions } from './designTokens';

const { Header, Sider, Content } = Layout;
const shellBorder = `1px solid ${designTokens.antdToken.colorBorder}`;
const { Text } = Typography;

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;
const TITLEBAR_HEIGHT = 34;

function ElectronCustomTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const d = window.gameartDesktop;

  useEffect(() => {
    if (!d) return;
    void d.isMaximized().then(setIsMaximized);
    return d.onMaximizeChanged(setIsMaximized);
  }, [d]);

  const btnBase: React.CSSProperties = {
    WebkitAppRegion: 'no-drag',
    width: 46,
    height: TITLEBAR_HEIGHT,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    color: brandColors.gray600,
    transition: transitions.fast,
  };

  return (
    <div
      style={{
        height: TITLEBAR_HEIGHT,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 0,
        background: '#fff',
        borderBottom: shellBorder,
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, WebkitAppRegion: 'drag' }}>
        <img
          src={LOGO_SRC}
          alt=""
          width={16}
          height={16}
          style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
        />
        <Text strong style={{ fontSize: 12, lineHeight: `${TITLEBAR_HEIGHT}px`, color: brandColors.gray700, letterSpacing: '0.02em' }}>
          AAAFLOW
        </Text>
      </div>
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          aria-label="最小化"
          onClick={() => d?.minimize()}
          onMouseEnter={() => setHoveredBtn('min')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{ ...btnBase, background: hoveredBtn === 'min' ? brandColors.gray100 : 'transparent' }}
        >
          <MinusOutlined style={{ fontSize: 11 }} />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? '还原' : '最大化'}
          onClick={() => d?.maximize()}
          onMouseEnter={() => setHoveredBtn('max')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{ ...btnBase, background: hoveredBtn === 'max' ? brandColors.gray100 : 'transparent' }}
        >
          {isMaximized ? <BlockOutlined style={{ fontSize: 11 }} /> : <BorderOutlined style={{ fontSize: 11 }} />}
        </button>
        <button
          type="button"
          aria-label="关闭"
          onClick={() => d?.closeWindow()}
          onMouseEnter={() => setHoveredBtn('close')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            ...btnBase,
            borderRadius: '0 0 0 0',
            background: hoveredBtn === 'close' ? '#e81123' : 'transparent',
            color: hoveredBtn === 'close' ? '#fff' : brandColors.gray600,
          }}
        >
          <CloseOutlined style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}

export default function DesktopAppShell() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const kick = window.setTimeout(() => { void ping(); }, 0);
    const t = window.setInterval(ping, 5000);
    return () => { window.clearTimeout(kick); window.clearInterval(t); };
  }, [ping]);

  const requestNewChat = () => window.dispatchEvent(new CustomEvent('gameart:new-chat'));
  const toggleHistory = () => window.dispatchEvent(new CustomEvent('gameart:toggle-history'));

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

  const selectedKey =
    menuItems.find(
      (item) => location.pathname === item.key || (item.key !== '/' && location.pathname.startsWith(item.key)),
    )?.key || '/';

  const isChat = location.pathname.startsWith('/chat');
  const contentPad = isChat ? 0 : 24;
  const contentBg = isChat ? '#fff' : figmaShellLayout.contentAreaBackground;
  const contentOverflow = isChat ? 'hidden' : 'auto';
  const showElectronTitlebar = !!window.gameartDesktop?.isDesktop;

  return (
    <>
      <style>{`
        .desktop-sider .ant-menu-item-selected {
          background: ${gradients.siderActive} !important;
          border-right: 2.5px solid ${brandColors.primary};
        }
        .desktop-sider .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background: ${brandColors.gray50} !important;
        }
        .desktop-sider .ant-menu-item {
          transition: ${transitions.normal};
          border-right: 2.5px solid transparent;
        }
        .desktop-header-btn:hover {
          color: ${brandColors.primary} !important;
          background: ${brandColors.primaryBg} !important;
        }
      `}</style>
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: figmaShellLayout.shellBackground,
        }}
      >
        {showElectronTitlebar && <ElectronCustomTitleBar />}
        <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: figmaShellLayout.shellBackground }}>
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={figmaShellLayout.siderWidth}
            theme="light"
            className="desktop-sider"
            style={{
              background: '#fff',
              borderRight: shellBorder,
              height: '100%',
              overflow: 'auto',
              boxShadow: '1px 0 4px rgba(0,0,0,0.03)',
              position: 'relative',
            }}
          >
            <div
              style={{
                padding: '18px 14px',
                borderBottom: shellBorder,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 60,
                background: gradients.headerGlow,
              }}
            >
              <img
                src={LOGO_SRC}
                alt="AAAFLOW"
                width={30}
                height={30}
                style={{ borderRadius: token.borderRadius, objectFit: 'cover', flexShrink: 0, boxShadow: shadows.xs }}
              />
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.25 }} className="text-gradient-brand">
                    AAAFLOW
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    游戏美术智能体
                  </Text>
                </div>
              )}
            </div>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: 'none', padding: '10px 8px' }}
            />
            {/* Sidebar footer */}
            {user && !collapsed && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '14px 16px', borderTop: shellBorder,
                background: brandColors.gray50,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: gradients.primaryBtn, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                  }}>
                    {(user.full_name || user.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: brandColors.gray900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

          <Layout style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Header
              style={{
                height: figmaShellLayout.headerHeight,
                lineHeight: `${figmaShellLayout.headerHeight}px`,
                padding: '0 24px',
                background: '#fff',
                borderBottom: shellBorder,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Space size="middle" wrap>
                <Badge
                  status={backendOk === null ? 'default' : backendOk ? 'success' : 'error'}
                  text={
                    <span style={{ fontSize: 13, color: brandColors.gray500 }}>
                      {backendOk === null ? '检查连接…' : backendOk ? '已连接后台' : '未连上后台'}
                    </span>
                  }
                />
              </Space>
              <Space wrap size={4}>
                {isChat && (
                  <>
                    <Button type="primary" icon={<PlusOutlined />} onClick={requestNewChat} className="btn-gradient" style={{ borderRadius: 8 }}>
                      新对话
                    </Button>
                    <Button icon={<HistoryOutlined />} onClick={toggleHistory} style={{ borderRadius: 8 }}>
                      历史对话
                    </Button>
                  </>
                )}
                <Button type="text" className="desktop-header-btn" icon={<BellOutlined />} onClick={() => navigate('/notifications')} style={{ borderRadius: 8 }} />
                <Button type="text" className="desktop-header-btn" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} style={{ borderRadius: 8 }}>
                  帮助
                </Button>
                <Button type="text" className="desktop-header-btn" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} style={{ borderRadius: 8 }}>
                  设置
                </Button>
              </Space>
            </Header>

            <Content
              key={location.pathname}
              className="page-transition-subtle"
              style={{
                padding: contentPad,
                background: contentBg,
                overflow: contentOverflow,
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
              </div>
            </Content>
          </Layout>

          <AaaflowHelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
          <ConnectionSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Layout>
      </div>
    </>
  );
}
