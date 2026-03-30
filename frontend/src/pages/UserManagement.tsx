import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Button, Table, Tag, Space, Modal, Form, Input, Select, message, Avatar, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, UserOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AuthUser } from '../types';
import { userApi } from '../services/api';
import { brandColors } from '../designTokens';

const { Title } = Typography;

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'blue' },
  user: { label: '普通用户', color: 'green' },
  readonly: { label: '只读', color: 'default' },
};

export default function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await userApi.list({ page: p, page_size: 20 });
      setUsers(data.users);
      setTotal(data.total);
      setPage(p);
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (u: AuthUser) => {
    setEditing(u);
    form.setFieldsValue({ full_name: u.full_name, department: u.department, email: u.email, role: u.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await userApi.update(editing.id, values);
        message.success('用户已更新');
      } else {
        await userApi.create(values);
        message.success('用户已创建');
      }
      setModalOpen(false);
      void fetch(page);
    } catch {
      message.error(editing ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (u: AuthUser) => {
    Modal.confirm({
      title: `确定停用用户 "${u.username}"？`,
      content: '停用后该用户将无法登录。',
      okText: '停用',
      okButtonProps: { danger: true },
      onOk: async () => {
        await userApi.deactivate(u.id);
        message.success('已停用');
        void fetch(page);
      },
    });
  };

  const filtered = search
    ? users.filter((u) => u.username.includes(search) || u.email.includes(search) || (u.full_name || '').includes(search))
    : users;

  const columns: ColumnsType<AuthUser> = [
    {
      title: '用户', dataIndex: 'username', key: 'username',
      render: (_, r) => (
        <Space>
          <Avatar size={32} style={{ background: brandColors.primary }} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600, color: brandColors.gray900 }}>{r.username}</div>
            <div style={{ fontSize: 12, color: brandColors.gray400 }}>{r.full_name || '—'}</div>
          </div>
        </Space>
      ),
    },
    { title: '邮箱', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: '部门', dataIndex: 'department', key: 'department', render: (v) => v || '—' },
    {
      title: '角色', dataIndex: 'role', key: 'role',
      render: (v: string) => {
        const r = ROLE_MAP[v] || { label: v, color: 'default' };
        return <Tag color={r.color}>{r.label}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => <Badge status={v ? 'success' : 'error'} text={v ? '活跃' : '停用'} />,
    },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          {r.is_active && (
            <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleDeactivate(r)}>停用</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>用户管理</Title>
        <Space>
          <Input
            placeholder="搜索用户名/邮箱"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} className="btn-gradient" onClick={openCreate}>
            新建用户
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => void fetch(p), showTotal: (t) => `共 ${t} 人` }}
        style={{ background: '#fff', borderRadius: 12 }}
      />
      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {!editing && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '必填' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '至少6位' }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="email" label="邮箱" rules={[{ required: !editing, type: 'email', message: '请输入有效邮箱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
            <Select options={[{ value: 'admin', label: '管理员' }, { value: 'user', label: '普通用户' }, { value: 'readonly', label: '只读' }]} />
          </Form.Item>
          {editing && (
            <Form.Item name="password" label="重置密码（留空不改）">
              <Input.Password placeholder="输入新密码" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
