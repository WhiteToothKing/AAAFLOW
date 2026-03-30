import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Form, Input, Button, Typography, message, Space, theme,
  Checkbox, Collapse, Modal, Alert,
} from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

import { authApi, setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setAccessToken, getAccessToken } from '../services/authStorage';
import { shellPageBackground } from '../utils/clientChrome';
import { isAuthDisabled } from '../utils/authMode';

const { Title, Paragraph, Text } = Typography;

const KEY_REMEMBER = 'aaaflow.login.remember';
const KEY_USERNAME = 'aaaflow.login.username';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { token } = theme.useToken();

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthDisabled()) {
      navigate(from, { replace: true });
      return;
    }
    if (getAccessToken()) {
      navigate(from, { replace: true });
    }
  }, [from, navigate]);

  useEffect(() => {
    try {
      const remember = localStorage.getItem(KEY_REMEMBER) === '1';
      const u = localStorage.getItem(KEY_USERNAME) || '';
      form.setFieldsValue({
        username: u,
        remember,
        apiBase: getApiBaseUrl(),
      });
    } catch {
      form.setFieldsValue({ apiBase: getApiBaseUrl() });
    }
  }, [form]);

  const onFinish = async (v: {
    username: string;
    password: string;
    apiBase?: string;
    remember?: boolean;
  }) => {
    setLoginError(null);
    if (v.apiBase?.trim()) {
      setApiBaseUrl(v.apiBase.trim());
    }
    try {
      if (v.remember) {
        localStorage.setItem(KEY_REMEMBER, '1');
        localStorage.setItem(KEY_USERNAME, v.username.trim());
      } else {
        localStorage.removeItem(KEY_REMEMBER);
        localStorage.removeItem(KEY_USERNAME);
      }
    } catch {
      /* ignore */
    }

    setLoading(true);
    try {
      const data = await authApi.login(v.username, v.password);
      setAccessToken(data.access_token);
      message.success('登录成功');
      let target = from;
      try {
        const stored = sessionStorage.getItem('aaaflow_login_return');
        if (stored) {
          sessionStorage.removeItem('aaaflow_login_return');
          target = stored;
        }
      } catch {
        /* ignore */
      }
      navigate(target, { replace: true });
    } catch {
      setLoginError(
        '登录失败：请核对用户名和密码，并确认 API 地址能打开（须含 /api，与后台一致）。',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: shellPageBackground(),
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 400,
          maxWidth: '100%',
          border: `1px solid ${token.colorBorder}`,
          boxShadow: token.boxShadowSecondary,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              AAAFLOW
            </Title>
            <Text type="secondary">内网私有化登录</Text>
          </div>

          {loginError ? (
            <Alert type="error" showIcon message={loginError} closable onClose={() => setLoginError(null)} />
          ) : null}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={() => loginError && setLoginError(null)}
            requiredMark={false}
            initialValues={{ apiBase: getApiBaseUrl(), remember: false }}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} autoComplete="username" size="large" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>在本机记住登录状态</Checkbox>
                </Form.Item>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setForgotOpen(true)}>
                  忘记密码？
                </Button>
              </Space>
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              登录
            </Button>

            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'api',
                  label: '连接设置（API 根地址）',
                  children: (
                    <Form.Item
                      label="API 根地址"
                      name="apiBase"
                      rules={[{ required: true, message: '请填写后端地址' }]}
                      extra="须含 /api 后缀；登录后可在顶栏「设置」中修改。"
                    >
                      <Input placeholder="http://127.0.0.1:8000/api" />
                    </Form.Item>
                  ),
                },
              ]}
            />
          </Form>

          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            首次部署请管理员使用 POST /api/auth/setup（请求头 X-Setup-Token）创建首个账号，详见{' '}
            <Text code>docs/PRIVATE_DEPLOY.md</Text>。
          </Paragraph>
        </Space>
      </Card>

      <Modal
        title="忘记密码"
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setForgotOpen(false)}>
            知道了
          </Button>,
        ]}
      >
        <Paragraph style={{ marginBottom: 0 }}>
          私有化部署未开放自助重置时，请联系管理员在后台重置账号密码。
        </Paragraph>
      </Modal>
    </div>
  );
}
