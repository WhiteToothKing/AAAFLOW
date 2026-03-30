import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
  Checkbox,
  Collapse,
  Modal,
  Alert,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BulbOutlined,
  PictureOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { authApi, setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setAccessToken, getAccessToken } from '../services/authStorage';
import { shellPageBackground } from '../utils/clientChrome';
import { isAuthDisabled } from '../utils/authMode';
import { brandColors, gradients, shadows, transitions } from '../designTokens';

const { Title, Text, Paragraph } = Typography;

const KEY_REMEMBER = 'aaaflow.login.remember';
const KEY_USERNAME = 'aaaflow.login.username';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)';

const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) || '1.0.0';

const FEATURES = [
  { icon: <BulbOutlined />, title: '智能需求分析' },
  { icon: <PictureOutlined />, title: '多模型图像生成' },
  { icon: <AppstoreOutlined />, title: '一站式工作流' },
] as const;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
    <>
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginBrandFadeIn {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) rotate(12deg); }
          50%      { transform: translate(8px, -12px) rotate(14deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-10px, 14px); }
        }
        @keyframes floatC {
          0%, 100% { transform: rotate(18deg); }
          50%      { transform: rotate(22deg) translateY(6px); }
        }
        .login-root {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }

        /* ---- Brand panel (left 60%) ---- */
        .login-brand {
          flex: 0 0 60%;
          max-width: 60%;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px 64px;
          background: ${BRAND_GRADIENT};
        }
        .login-brand__content {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          opacity: 0;
        }
        .login-brand__content--visible {
          animation: loginBrandFadeIn 0.7s ease-out forwards;
        }

        /* Geometric overlay shapes */
        .login-geo {
          pointer-events: none;
          position: absolute;
        }
        .login-geo--circle-lg {
          width: 440px; height: 440px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          top: -10%; right: -8%;
          animation: floatB 14s ease-in-out infinite;
        }
        .login-geo--rect {
          width: 300px; height: 300px;
          border-radius: 24px;
          background: rgba(255,255,255,0.05);
          bottom: 6%; left: -6%;
          animation: floatA 12s ease-in-out infinite;
        }
        .login-geo--circle-ring {
          width: 200px; height: 200px;
          border: 2px solid rgba(255,255,255,0.10);
          border-radius: 50%;
          bottom: 20%; right: 10%;
          background: transparent;
          animation: floatB 18s ease-in-out infinite reverse;
        }
        .login-geo--triangle {
          width: 0; height: 0;
          border-left: 120px solid transparent;
          border-right: 120px solid transparent;
          border-bottom: 200px solid rgba(255,255,255,0.04);
          top: 32%; left: 4%;
          animation: floatC 16s ease-in-out infinite;
        }
        .login-geo--dots {
          top: 10%; left: 30%;
          width: 160px; height: 120px;
          background-image: radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px);
          background-size: 20px 20px;
          animation: floatB 20s ease-in-out infinite;
        }

        /* Feature cards */
        .login-feature {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px 22px;
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          transition: ${transitions.normal};
        }
        .login-feature:hover {
          background: rgba(255,255,255,0.18);
          transform: translateX(4px);
        }
        .login-feature__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.18);
          font-size: 20px;
          flex-shrink: 0;
        }

        /* ---- Form panel (right 40%) ---- */
        .login-form-panel {
          flex: 0 0 40%;
          max-width: 40%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          background: #ffffff;
        }
        .login-form-wrapper {
          width: 100%;
          max-width: 400px;
          opacity: 0;
        }
        .login-form-wrapper--visible {
          animation: loginFadeIn 0.6s 0.15s ease-out forwards;
        }

        /* Submit button gradient */
        .login-form-panel .ant-btn.login-submit-btn {
          background: ${gradients.primaryBtn};
          color: #fff !important;
          border: none !important;
          box-shadow: 0 4px 14px -3px rgba(37,99,235,0.35);
          transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.2s ease;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .login-form-panel .ant-btn.login-submit-btn:not(:disabled):hover {
          background: ${gradients.primaryBtn} !important;
          color: #fff !important;
          border: none !important;
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 8px 24px -4px rgba(37,99,235,0.45), 0 0 0 3px rgba(37,99,235,0.10);
          filter: brightness(1.05);
        }
        .login-form-panel .ant-btn.login-submit-btn:not(:disabled):active {
          transform: translateY(0) scale(0.995);
          box-shadow: 0 2px 8px -2px rgba(37,99,235,0.3);
        }

        .login-forgot-link {
          transition: color 0.2s ease;
        }
        .login-forgot-link:hover {
          color: ${brandColors.primary} !important;
        }

        /* API settings collapse */
        .login-api-collapse .ant-collapse-header {
          padding: 8px 0 !important;
          color: ${brandColors.gray400} !important;
          font-size: 13px !important;
        }
        .login-api-collapse .ant-collapse-content-box {
          padding: 8px 0 0 !important;
        }

        /* ---- Responsive: hide brand panel below 960px ---- */
        @media (max-width: 959px) {
          .login-brand {
            display: none !important;
          }
          .login-form-panel {
            flex: 1 1 100%;
            max-width: 100%;
            min-height: 100vh;
            background: ${shellPageBackground()};
          }
        }
      `}</style>

      <div className="login-root">
        {/* ====== LEFT: Brand ====== */}
        <aside className="login-brand" aria-hidden="true">
          <div className="login-geo login-geo--circle-lg" />
          <div className="login-geo login-geo--rect" />
          <div className="login-geo login-geo--circle-ring" />
          <div className="login-geo login-geo--triangle" />
          <div className="login-geo login-geo--dots" />

          <div className={`login-brand__content${mounted ? ' login-brand__content--visible' : ''}`}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                marginBottom: 12,
              }}
            >
              AAAFLOW
            </div>
            <Text
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 18,
                lineHeight: 1.6,
                marginBottom: 40,
              }}
            >
              AI 赋能游戏美术全流程工作流
            </Text>

            <Space direction="vertical" size={14} style={{ width: '100%', maxWidth: 380 }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="login-feature">
                  <span className="login-feature__icon">{f.icon}</span>
                  <span>{f.title}</span>
                </div>
              ))}
            </Space>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13,
              marginTop: 48,
            }}
          >
            AAAFLOW v{APP_VERSION}
          </div>
        </aside>

        {/* ====== RIGHT: Login Form ====== */}
        <div className="login-form-panel">
          <div className={`login-form-wrapper${mounted ? ' login-form-wrapper--visible' : ''}`}>
            <div style={{ marginBottom: 36 }}>
              <Title
                level={3}
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 28,
                  fontWeight: 600,
                  color: brandColors.gray900,
                  lineHeight: 1.3,
                }}
              >
                欢迎回来
              </Title>
              <Text style={{ fontSize: 15, color: brandColors.gray400 }}>
                登录以继续使用 AAAFLOW
              </Text>
            </div>

            {loginError && (
              <Alert
                type="error"
                showIcon
                message={loginError}
                closable
                onClose={() => setLoginError(null)}
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={() => loginError && setLoginError(null)}
              requiredMark={false}
              initialValues={{ apiBase: getApiBaseUrl(), remember: false }}
              size="large"
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: brandColors.gray300 }} />}
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </Form.Item>
              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: brandColors.gray300 }} />}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住我</Checkbox>
                  </Form.Item>
                  <Button
                    type="link"
                    size="small"
                    className="login-forgot-link"
                    style={{ padding: 0 }}
                    onClick={() => setForgotOpen(true)}
                  >
                    忘记密码?
                  </Button>
                </div>
              </Form.Item>

              <Form.Item style={{ marginBottom: 20 }}>
                <Button
                  className="login-submit-btn"
                  htmlType="submit"
                  block
                  loading={loading}
                  size="large"
                >
                  登录
                </Button>
              </Form.Item>

              <Collapse
                ghost
                size="small"
                className="login-api-collapse"
                items={[
                  {
                    key: 'api',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <SettingOutlined /> API 服务器地址
                      </span>
                    ),
                    children: (
                      <Form.Item
                        label="API 根地址"
                        name="apiBase"
                        rules={[{ required: true, message: '请填写后端地址' }]}
                        extra="须含 /api 后缀；登录后可在顶栏「设置」中修改。"
                      >
                        <Input placeholder="http://127.0.0.1:8000/api" size="middle" />
                      </Form.Item>
                    ),
                  },
                ]}
              />
            </Form>

            <Paragraph
              type="secondary"
              style={{ fontSize: 12, marginTop: 24, marginBottom: 0, color: brandColors.gray400 }}
            >
              首次部署请管理员使用 POST /api/auth/setup（请求头 X-Setup-Token）创建首个账号，详见{' '}
              <Text code>docs/PRIVATE_DEPLOY.md</Text>。
            </Paragraph>
          </div>
        </div>
      </div>

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
    </>
  );
}
