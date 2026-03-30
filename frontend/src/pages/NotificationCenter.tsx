import { useState, useEffect, useRef } from 'react';
import {
  Typography, Card, List, Tag, Badge, Empty, Button, Space, Segmented,
} from 'antd';
import {
  BellOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined,
  CloseCircleOutlined, CheckOutlined,
} from '@ant-design/icons';
import { brandColors, shadows } from '../designTokens';

const { Title, Text } = Typography;

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const TYPE_CFG = {
  success: { icon: <CheckCircleOutlined />, color: brandColors.success, label: '成功' },
  info: { icon: <InfoCircleOutlined />, color: brandColors.info, label: '通知' },
  warning: { icon: <ExclamationCircleOutlined />, color: brandColors.warning, label: '警告' },
  error: { icon: <CloseCircleOutlined />, color: brandColors.error, label: '错误' },
};

function useWebSocketNotifications(): Notification[] {
  const [items, setItems] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = import.meta.env.VITE_API_URL?.replace(/^https?:/, proto) || `${proto}//${window.location.host}`;
    const token = localStorage.getItem('access_token');
    const url = `${base}/api/ws/tasks${token ? `?token=${token}` : ''}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.event === 'task_status') {
            const statusMap: Record<string, Notification['type']> = {
              completed: 'success', failed: 'error', generating: 'info', analyzing: 'info',
            };
            const n: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              type: statusMap[msg.data?.status] || 'info',
              title: `任务状态更新`,
              description: `"${msg.data?.title || msg.data?.task_id}" — ${msg.data?.status}`,
              time: new Date().toLocaleTimeString('zh-CN'),
              read: false,
            };
            setItems((prev) => [n, ...prev].slice(0, 100));
          }
        } catch { /* skip malformed */ }
      };
      ws.onclose = () => { wsRef.current = null; };
    } catch { /* ws not available */ }

    return () => { wsRef.current?.close(); };
  }, []);

  return items;
}

export default function NotificationCenter() {
  const wsNotifications = useWebSocketNotifications();
  const [filter, setFilter] = useState<string>('all');
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());

  const notifications = wsNotifications.map((n) => ({
    ...n,
    read: n.read || localRead.has(n.id),
  }));

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => setLocalRead((s) => new Set(s).add(id));
  const markAllRead = () => setLocalRead(new Set(notifications.map((n) => n.id)));

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>通知中心</Title>
          {unreadCount > 0 && <Badge count={unreadCount} />}
        </Space>
        <Button size="small" icon={<CheckOutlined />} disabled={unreadCount === 0} onClick={markAllRead}>
          全部已读
        </Button>
      </div>

      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as string)}
        options={[
          { value: 'all', label: '全部' },
          { value: 'unread', label: `未读 (${unreadCount})` },
          { value: 'success', label: '成功' },
          { value: 'error', label: '异常' },
          { value: 'info', label: '信息' },
        ]}
        style={{ marginBottom: 20 }}
      />

      {filtered.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 48 }}>
          <Empty
            image={<BellOutlined style={{ fontSize: 48, color: brandColors.gray300 }} />}
            description={
              <div>
                <Text style={{ fontSize: 15, color: brandColors.gray500 }}>暂无通知</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    当任务状态变化时会实时推送到这里
                  </Text>
                </div>
              </div>
            }
          />
        </Card>
      ) : (
        <List
          dataSource={filtered}
          renderItem={(item) => {
            const cfg = TYPE_CFG[item.type];
            return (
              <Card
                key={item.id}
                onClick={() => markRead(item.id)}
                style={{
                  marginBottom: 8, borderRadius: 10, cursor: 'pointer',
                  borderLeft: `3px solid ${cfg.color}`,
                  background: item.read ? '#fff' : brandColors.gray50,
                  boxShadow: item.read ? 'none' : shadows.xs,
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: '14px 20px' } }}
                hoverable
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ color: cfg.color, fontSize: 18, marginTop: 2 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong={!item.read} style={{ fontSize: 14 }}>{item.title}</Text>
                      <Space size={8}>
                        <Tag color={cfg.color} style={{ margin: 0, fontSize: 11, padding: '0 6px' }}>{cfg.label}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>{item.description}</Text>
                  </div>
                  {!item.read && <Badge dot color={cfg.color} />}
                </div>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}
