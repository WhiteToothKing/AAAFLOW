import { useState, useEffect } from 'react';
import {
  Typography, Card, Descriptions, Tag, Spin, Alert, Button, Space, Divider,
} from 'antd';
import {
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, ApiOutlined,
  DatabaseOutlined, CloudServerOutlined, ControlOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { systemApi, type SystemStatsResponse } from '../services/api';
import { brandColors } from '../designTokens';

const { Text } = Typography;

interface SystemConfig {
  app_name: string;
  app_version: string;
  debug: boolean;
  auth_disabled: boolean;
  production_mode: boolean;
  cors_allow_all: boolean;
  cors_origins: string;
  max_upload_size_mb: number;
  default_llm_provider: string;
  comfyui_api_url: string;
  providers_configured: Record<string, boolean>;
}

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT / DALL-E)',
  gemini: 'Google Gemini',
  midjourney: 'Midjourney',
  jimeng: '即梦 (Jimeng)',
  minimax: 'MiniMax',
  banana: 'Banana Pro',
};

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        systemApi.config() as Promise<SystemConfig>,
        systemApi.stats(),
      ]);
      setConfig(c);
      setStats(s);
    } catch {
      setError('加载系统配置失败，请确认您有管理员权限');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <PageContainer
        ghost
        breadcrumbRender={false}
        title={
          <Space>
            <ControlOutlined />
            系统设置
          </Space>
        }
        subTitle="查看当前服务器运行配置（只读）"
      >
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      </PageContainer>
    );
  }
  if (error) {
    return (
      <PageContainer
        ghost
        breadcrumbRender={false}
        title={
          <Space>
            <ControlOutlined />
            系统设置
          </Space>
        }
        subTitle="查看当前服务器运行配置（只读）"
      >
        <Alert type="error" message={error} showIcon />
      </PageContainer>
    );
  }
  if (!config) return null;

  return (
    <PageContainer
      className="animate-fade-in-up"
      ghost
      breadcrumbRender={false}
      title={
        <Space>
          <ControlOutlined />
          系统设置
        </Space>
      }
      subTitle="查看当前服务器运行配置（只读）"
      extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>}
    >
      <Space direction="vertical" size={20} style={{ width: '100%', maxWidth: 1000 }}>
        {/* System Info */}
        <Card
          title={<Space><DatabaseOutlined style={{ color: brandColors.primary }} /> 系统信息</Space>}
          style={{ borderRadius: 12 }}
        >
          <Descriptions column={3} size="small">
            <Descriptions.Item label="应用名">{config.app_name}</Descriptions.Item>
            <Descriptions.Item label="版本">{config.app_version}</Descriptions.Item>
            <Descriptions.Item label="调试模式">
              <Tag color={config.debug ? 'orange' : 'green'}>{config.debug ? '开启' : '关闭'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="认证">
              <Tag color={config.auth_disabled ? 'red' : 'green'}>{config.auth_disabled ? '已禁用' : '已启用'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="生产模式">
              <Tag color={config.production_mode ? 'blue' : 'default'}>{config.production_mode ? '是' : '否'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最大上传">{config.max_upload_size_mb} MB</Descriptions.Item>
          </Descriptions>
          {stats && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Space size="large">
                <Text type="secondary">用户数: <Text strong>{stats.users.total}</Text></Text>
                <Text type="secondary">总任务: <Text strong>{stats.tasks.total}</Text></Text>
                <Text type="secondary">生成中: <Text strong>{stats.tasks.generating}</Text></Text>
                <Text type="secondary">已完成: <Text strong>{stats.tasks.completed}</Text></Text>
              </Space>
            </>
          )}
        </Card>

        {/* API Providers */}
        <Card
          title={<Space><ApiOutlined style={{ color: brandColors.accent }} /> API 提供方状态</Space>}
          style={{ borderRadius: 12 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {Object.entries(config.providers_configured).map(([key, ok]) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${ok ? brandColors.gray100 : brandColors.gray200}`,
                  background: ok ? brandColors.successBg : brandColors.gray50,
                }}
              >
                {ok
                  ? <CheckCircleOutlined style={{ color: brandColors.success, fontSize: 18 }} />
                  : <CloseCircleOutlined style={{ color: brandColors.gray400, fontSize: 18 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: brandColors.gray900 }}>
                    {PROVIDER_NAMES[key] || key}
                  </div>
                  <div style={{ fontSize: 12, color: ok ? brandColors.success : brandColors.gray400 }}>
                    {ok ? '已配置' : '未配置'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ComfyUI & LLM */}
        <Card
          title={<Space><CloudServerOutlined style={{ color: brandColors.info }} /> 连接配置</Space>}
          style={{ borderRadius: 12 }}
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="默认 LLM">{config.default_llm_provider}</Descriptions.Item>
            <Descriptions.Item label="ComfyUI 地址">{config.comfyui_api_url}</Descriptions.Item>
            <Descriptions.Item label="CORS">
              <Tag color={config.cors_allow_all ? 'orange' : 'blue'}>{config.cors_allow_all ? '全开放 (*)' : '限制来源'}</Tag>
            </Descriptions.Item>
            {!config.cors_allow_all && (
              <Descriptions.Item label="允许来源">{config.cors_origins}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </Space>
    </PageContainer>
  );
}
