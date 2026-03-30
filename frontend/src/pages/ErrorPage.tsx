import { Button, Result, Typography, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';

import { brandColors, shadows } from '../designTokens';

const { Text } = Typography;

const CONFIG: Record<string, { status: '403' | '404' | '500'; title: string; subtitle: string }> = {
  '403': { status: '403', title: '权限不足', subtitle: '您没有访问此页面的权限，请联系管理员。' },
  '404': { status: '404', title: '页面不存在', subtitle: '您访问的页面不存在或已被移除。' },
  '500': { status: '500', title: '服务器错误', subtitle: '服务暂时遇到问题，请稍后再试。' },
};

export default function ErrorPage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();

  const cfg = CONFIG[code?.toLowerCase() || ''] || CONFIG['404'];

  return (
    <div
      className="animate-fade-in-up"
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 56px',
        boxShadow: shadows.lg, maxWidth: 520, width: '100%', textAlign: 'center',
        border: `1px solid ${brandColors.gray100}`,
      }}>
        <Result
          status={cfg.status}
          title={<span style={{ fontSize: 24, fontWeight: 700, color: brandColors.gray900 }}>{cfg.title}</span>}
          subTitle={
            <Text style={{ color: brandColors.gray500, fontSize: 15 }}>
              {cfg.subtitle}
            </Text>
          }
          extra={
            <Space size={12}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                size="large"
                style={{ borderRadius: 10, height: 44 }}
              >
                返回上页
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
                className="btn-gradient"
                style={{ borderRadius: 10, height: 44 }}
              >
                返回工作台
              </Button>
            </Space>
          }
        />
      </div>
    </div>
  );
}
