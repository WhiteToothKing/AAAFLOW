import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  message,
} from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { UserOutlined, SafetyOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import api, { taskApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { ArtTask } from '../types';
import { TaskStatus as TS } from '../types';
import { brandColors, gradients, shadows } from '../designTokens';
import { ListPageTableSkeleton } from '../components/listPageShared';

const heroCardStyle: CSSProperties = {
  background: gradients.heroCard,
  borderRadius: 16,
  boxShadow: shadows.md,
  border: `1px solid ${brandColors.gray200}`,
  padding: 24,
  marginBottom: 16,
};

const statColStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: '#fff',
  border: `1px solid ${brandColors.gray100}`,
  boxShadow: shadows.xs,
};

export default function Profile() {
  const { user, loading: userLoading } = useAuth();
  const [profileForm] = Form.useForm<{ full_name?: string; department?: string }>();
  const [pwdForm] = Form.useForm<{ current_password: string; new_password: string; confirm: string }>();
  const [profileSaving, setProfileSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [taskStats, setTaskStats] = useState({
    submitted: 0,
    completed: 0,
    successRate: 0,
    avgRating: 0 as number | null,
  });

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        full_name: user.full_name,
        department: user.department,
      });
    }
  }, [user, profileForm]);

  const loadMyTaskStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    try {
      const mine: ArtTask[] = [];
      let page = 1;
      const pageSize = 100;
      let totalPages = 1;
      const maxPages = 40;

      while (page <= totalPages && page <= maxPages) {
        const data = await taskApi.list({ page, page_size: pageSize });
        totalPages = Math.ceil(data.total / pageSize) || 1;
        mine.push(...data.tasks.filter((t) => t.creator_id === userId));
        if (data.tasks.length < pageSize) break;
        page += 1;
      }

      const submitted = mine.length;
      const completed = mine.filter((t) => t.status === TS.COMPLETED).length;
      const failed = mine.filter((t) => t.status === TS.FAILED).length;
      const finished = completed + failed;
      const successRate = finished > 0 ? Math.round((completed / finished) * 100) : 0;

      let ratingSum = 0;
      let ratingCount = 0;
      for (const t of mine) {
        for (const r of t.results || []) {
          if (typeof r.rating === 'number') {
            ratingSum += r.rating;
            ratingCount += 1;
          }
        }
      }
      const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

      setTaskStats({ submitted, completed, successRate, avgRating });
    } catch {
      message.error('加载任务统计失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) void loadMyTaskStats(user.id);
  }, [user?.id, loadMyTaskStats]);

  const saveProfile = async () => {
    const v = await profileForm.validateFields();
    setProfileSaving(true);
    try {
      await api.patch('/users/me/profile', v);
      message.success('资料已更新');
      window.dispatchEvent(new Event('aaaflow:auth-changed'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '保存失败');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    const v = await pwdForm.validateFields();
    if (v.new_password !== v.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPwdSaving(true);
    try {
      await api.post('/users/me/password', {
        current_password: v.current_password,
        new_password: v.new_password,
      });
      message.success('密码已更新');
      pwdForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '修改失败');
    } finally {
      setPwdSaving(false);
    }
  };

  if (userLoading) {
    return (
      <PageContainer ghost breadcrumbRender={false} title="个人资料">
        <ListPageTableSkeleton rows={5} />
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer ghost breadcrumbRender={false} title="个人资料">
        <Card>请先登录</Card>
      </PageContainer>
    );
  }

  const roleCfg: Record<string, { color: string; label: string }> = {
    admin: { color: 'purple', label: '管理员' },
    user: { color: 'blue', label: '普通用户' },
    readonly: { color: 'default', label: '只读' },
  };
  const rc = roleCfg[user.role] || { color: 'default', label: user.role };

  const tabItems = [
    {
      key: 'basic',
      label: (
        <Space size={6}>
          <UserOutlined />
          基本信息
        </Space>
      ),
      children: (
        <Card style={{ boxShadow: shadows.card, borderRadius: 12 }}>
          <Form form={profileForm} layout="vertical" style={{ maxWidth: 480 }}>
            <Form.Item name="full_name" label="姓名">
              <Input placeholder="显示名称" />
            </Form.Item>
            <Form.Item name="department" label="部门">
              <Input placeholder="所属部门" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={() => void saveProfile()} loading={profileSaving}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'security',
      label: (
        <Space size={6}>
          <SafetyOutlined />
          安全设置
        </Space>
      ),
      children: (
        <Card style={{ boxShadow: shadows.card, borderRadius: 12 }}>
          <Form form={pwdForm} layout="vertical" style={{ maxWidth: 480 }}>
            <Form.Item name="current_password" label="当前密码" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="确认新密码"
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('与新密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={() => void savePassword()} loading={pwdSaving}>
                更新密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'stats',
      label: (
        <Space size={6}>
          <BarChartOutlined />
          我的任务统计
        </Space>
      ),
      children: statsLoading ? (
        <ListPageTableSkeleton rows={2} />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={statColStyle}>
              <Statistic title="提交总数" value={taskStats.submitted} valueStyle={{ color: brandColors.primary }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={statColStyle}>
              <Statistic title="已完成" value={taskStats.completed} valueStyle={{ color: brandColors.success }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={statColStyle}>
              <Statistic title="成功率" suffix="%" value={taskStats.successRate} valueStyle={{ color: brandColors.accent }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={statColStyle}>
              <Statistic
                title="平均评分"
                value={taskStats.avgRating ?? '—'}
                valueStyle={{ color: brandColors.warning }}
              />
            </div>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <PageContainer ghost breadcrumbRender={false} title="个人资料" subTitle="查看与更新账号信息">
      <div style={heroCardStyle}>
        <Space align="start" size={20} wrap>
          <Avatar size={64} style={{ backgroundColor: brandColors.primary, flexShrink: 0 }}>
            {(user.username || '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Space size={12} wrap style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: brandColors.gray900 }}>{user.username}</span>
              <Tag color={rc.color}>{rc.label}</Tag>
            </Space>
            <div style={{ color: brandColors.gray600, lineHeight: 1.8 }}>
              <div>邮箱：{user.email}</div>
              <div>部门：{user.department || '—'}</div>
              <div>加入时间：{dayjs(user.created_at).format('YYYY-MM-DD')}</div>
            </div>
          </div>
        </Space>
      </div>

      <Tabs items={tabItems} size="large" />
    </PageContainer>
  );
}
