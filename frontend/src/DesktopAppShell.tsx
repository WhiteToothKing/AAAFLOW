import { useEffect, useState, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Button, Space, Typography, Badge, theme,
} from 'antd';
import {
  QuestionCircleOutlined, SettingOutlined, PlusOutlined, HistoryOutlined,
  DashboardOutlined, MessageOutlined, PlusCircleOutlined, UnorderedListOutlined,
  ThunderboltOutlined, FileSearchOutlined, LayoutOutlined, ScheduleOutlined,
} from '@ant-design/icons';

import { healthApi } from './services/api';
import { useAuth } from './hooks/useAuth';
import { AaaflowHelpDrawer } from './components/AaaflowHelpDrawer';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { figmaShellLayout } from './generated/figmaShellLayout';
import { designTokens } from './designTokens';

// 与 Figma Page 1「AAAFLOW Desktop Shell」对照；同步 npm run figma:sync，对照页 /design/figma

const { Header, Sider, Content } = Layout;
const shellBorder = `1px solid ${designTokens.antdToken.colorBorder}`;
const { Text } = Typography;

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export default function DesktopAppShell() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    const t = window.setInterval(ping, 5000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(t);
    };
  }, [ping]);

  const requestNewChat = () => {
    window.dispatchEvent(new CustomEvent('gameart:new-chat'));
  };

  const toggleHistory = () => {
    window.dispatchEvent(new CustomEvent('gameart:toggle-history'));
  };

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

  const selectedKey =
    menuItems.find(
      (item) =>
        location.pathname === item.key ||
        (item.key !== '/' && location.pathname.startsWith(item.key)),
    )?.key || '/';

  const isChat = location.pathname.startsWith('/chat');
  const contentPad = isChat ? 0 : 24;
  const contentBg = isChat ? '#fff' : figmaShellLayout.contentAreaBackground;
  const contentOverflow = isChat ? 'hidden' : 'auto';

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: figmaShellLayout.shellBackground }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={figmaShellLayout.siderWidth}
        theme="light"
        style={{
          background: figmaShellLayout.siderBackground,
          borderRight: shellBorder,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '14px 12px',
            borderBottom: shellBorder,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 56,
          }}
        >
          <img
            src={LOGO_SRC}
            alt="AAAFLOW"
            width={32}
            height={32}
            style={{ borderRadius: token.borderRadius, objectFit: 'cover', flexShrink: 0 }}
          />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.25 }}>
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
          style={{ border: 'none', padding: '8px 12px' }}
        />
      </Sider>

      <Layout style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header
          style={{
            height: figmaShellLayout.headerHeight,
            lineHeight: `${figmaShellLayout.headerHeight}px`,
            padding: '0 20px',
            background: figmaShellLayout.headerBackground,
            borderBottom: shellBorder,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size="middle" wrap>
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
            {isChat && (
              <>
                <Button type="primary" icon={<PlusOutlined />} onClick={requestNewChat}>
                  新对话
                </Button>
                <Button icon={<HistoryOutlined />} onClick={toggleHistory}>
                  历史对话
                </Button>
              </>
            )}
            <Button icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)}>
              使用说明
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              设置
            </Button>
          </Space>
        </Header>

        <Content
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
  );
}
