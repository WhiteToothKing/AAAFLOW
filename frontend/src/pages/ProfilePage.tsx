import { useState, useCallback, useEffect } from 'react';
import {
  Typography, Card, Avatar, Tag, Tabs, Form, Input, Button, message, Space, Statistic, Row, Col, Spin,
} from 'antd';
import { LockOutlined, BarChartOutlined, SafetyOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import api, { taskApi } from '../services/api';
import { TaskStatus as TS } from '../types';
import { brandColors, gradients, shadows } from '../designTokens';

const { Title, Text } = Typography;

const ROLE_MAP: Record<string, string> = { admin: '管理员', user: '普通用户', readonly: '只读' };

export default function ProfilePage() {
  const { user, loading: userLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [profileForm] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [statsLoading, setStatsLoading] = useState(false);
  const [taskStats, setTaskStats] = useState({ submitted: 0, completed: 0, successRate: 0, avgRating: null as number | null });

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({ full_name: user.full_name || '', department: user.department || '' });
    }
  }, [user, profileForm]);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    setStatsLoading(true);
    try {
      const data = await taskApi.list({ page: 1, page_size: 100 });
      const mine = data.tasks.filter((t) => t.creator_id === user.id);
      const submitted = mine.length;
      const completed = mine.filter((t) => t.status === TS.COMPLETED).length;
      const failed = mine.filter((t) => t.status === TS.FAILED).length;
      const finished = completed + failed;
      const successRate = finished > 0 ? Math.round((completed / finished) * 100) : 0;
      let rSum = 0, rCnt = 0;
      for (const t of mine) for (const r of t.results || []) if (typeof r.rating === 'number') { rSum += r.rating; rCnt++; }
      setTaskStats({ submitted, completed, successRate, avgRating: rCnt > 0 ? Math.round((rSum / rCnt) * 10) / 10 : null });
    } catch { /* ignore */ } finally { setStatsLoading(false); }
  }, [user?.id]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  if (userLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!user) return null;

  const handleProfileSave = async () => {
    const values = await profileForm.validateFields();
    setSaving(true);
    try {
      await api.patch('/users/me/profile', values);
      message.success('资料已更新');
      window.dispatchEvent(new Event('aaaflow:auth-changed'));
    } catch {
      message.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const values = await pwForm.validateFields();
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入密码不一致');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/users/me/password', {
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      message.success('密码已修改');
      pwForm.resetFields();
    } catch {
      message.error('修改失败');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Profile Hero */}
      <Card
        style={{
          borderRadius: 16, marginBottom: 24, overflow: 'hidden',
          background: gradients.heroCard, border: `1px solid ${brandColors.gray100}`,
        }}
        styles={{ body: { padding: '32px 36px' } }}
      >
        <Space size={24} align="start">
          <Avatar size={72} style={{ background: gradients.primaryBtn, fontSize: 28, boxShadow: shadows.md }}>
            {(user.full_name || user.username || '?')[0].toUpperCase()}
          </Avatar>
          <div>
            <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
              {user.full_name || user.username}
            </Title>
            <Space size={8}>
              <Tag color="blue">{ROLE_MAP[user.role] || user.role}</Tag>
              {user.department && <Tag>{user.department}</Tag>}
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{user.email}</Text>
              <Text type="secondary" style={{ marginLeft: 16 }}>
                加入时间: {new Date(user.created_at).toLocaleDateString('zh-CN')}
              </Text>
            </div>
          </div>
        </Space>
      </Card>

      <Tabs
        items={[
          {
            key: 'profile',
            label: <span><EditOutlined /> 基本信息</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Form
                  form={profileForm}
                  layout="vertical"
                  initialValues={{ full_name: user.full_name || '', department: user.department || '' }}
                  requiredMark={false}
                >
                  <Form.Item name="full_name" label="姓名">
                    <Input placeholder="您的姓名" />
                  </Form.Item>
                  <Form.Item name="department" label="部门">
                    <Input placeholder="所属部门" />
                  </Form.Item>
                  <Form.Item label="邮箱">
                    <Input value={user.email} disabled />
                  </Form.Item>
                  <Form.Item label="用户名">
                    <Input value={user.username} disabled />
                  </Form.Item>
                  <Button type="primary" loading={saving} onClick={handleProfileSave} className="btn-gradient">
                    保存修改
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'security',
            label: <span><SafetyOutlined /> 安全设置</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Title level={5}>修改密码</Title>
                <Form form={pwForm} layout="vertical" requiredMark={false} style={{ maxWidth: 400 }}>
                  <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="输入当前密码" />
                  </Form.Item>
                  <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: '至少6位' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="输入新密码" />
                  </Form.Item>
                  <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
                  </Form.Item>
                  <Button type="primary" loading={pwSaving} onClick={handlePasswordChange}>
                    修改密码
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'stats',
            label: <span><BarChartOutlined /> 我的统计</span>,
            children: statsLoading ? (
              <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}><Spin /></Card>
            ) : (
              <Card style={{ borderRadius: 12 }}>
                <Row gutter={24}>
                  <Col span={6}><Statistic title="总提交" value={taskStats.submitted} valueStyle={{ color: brandColors.primary }} /></Col>
                  <Col span={6}><Statistic title="已完成" value={taskStats.completed} valueStyle={{ color: brandColors.success }} /></Col>
                  <Col span={6}><Statistic title="成功率" suffix="%" value={taskStats.successRate} valueStyle={{ color: brandColors.accent }} /></Col>
                  <Col span={6}><Statistic title="平均评分" value={taskStats.avgRating ?? '—'} valueStyle={{ color: brandColors.warning }} /></Col>
                </Row>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
