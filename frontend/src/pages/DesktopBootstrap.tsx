import { useEffect, useState } from 'react';
import {
  Layout, Card, Button, Space, Typography, Alert, Input, theme, Divider,
} from 'antd';
import {
  CloudUploadOutlined, FolderOpenOutlined, MedicineBoxOutlined,
  ThunderboltOutlined, CheckCircleOutlined, LinkOutlined,
} from '@ant-design/icons';

import { figmaShellLayout } from '../generated/figmaShellLayout';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

/**
 * Electron 专用：后端未就绪时显示的「启动后台」页，视觉与主应用 Ant Design / Figma 壳一致（非旧版深色 HTML 启动台）。
 */
export default function DesktopBootstrap() {
  const { token } = theme.useToken();
  const [repoLine, setRepoLine] = useState('正在检测项目目录…');
  const [repoOk, setRepoOk] = useState(false);
  const [log, setLog] = useState('');
  const [status, setStatus] = useState<{ text: string; type?: 'success' | 'error' | 'warning' }>({
    text: '',
  });
  const [dockerBusy, setDockerBusy] = useState(false);

  const api = typeof window !== 'undefined' ? window.aaaflowLauncher : undefined;

  useEffect(() => {
    if (!api) return;
    void api.getRepoRoot().then((r) => {
      if (r?.ok && r.path) {
        setRepoLine(`项目根目录: ${r.path}`);
        setRepoOk(true);
      } else {
        setRepoLine(
          r?.message || '未找到 docker-compose.yml。请保留完整解压目录，使 exe 向上能找到项目根目录。',
        );
        setRepoOk(false);
      }
    });
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const offLog = api.onDockerLog((text) => {
      setLog((prev) => prev + text);
    });
    const offDone = api.onDockerDone((code) => {
      setDockerBusy(false);
      if (code === 0) {
        setStatus({ text: 'Docker 命令已结束，正在等待后端 API…', type: 'warning' });
        setLog((prev) => `${prev}\n--- docker compose 退出码: 0 ---\n`);
      } else {
        setStatus({
          text: `Docker 失败（退出码 ${code}）。请查看日志；若出现 auth.docker.io / connectex，需配置镜像加速或 VPN。`,
          type: 'error',
        });
        setLog((prev) => `${prev}\n--- docker compose 退出码: ${code} ---\n`);
      }
    });
    return () => {
      offLog();
      offDone();
    };
  }, [api]);

  if (!api) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 24,
          background: figmaShellLayout.shellBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card style={{ maxWidth: 480, borderRadius: token.borderRadiusLG }}>
          <Alert
            type="info"
            showIcon
            message="此页面由桌面客户端使用"
            description="在浏览器中打开时无法启动 Docker。请安装 AAAFLOW Windows 客户端；若后台已运行，请直接打开主程序进入登录。"
          />
        </Card>
      </div>
    );
  }

  const onStartDocker = async () => {
    setLog('');
    setDockerBusy(true);
    setStatus({ text: '正在检查配置文件…', type: 'warning' });
    const env = await api.ensureEnv();
    if (env?.openedNotepad) {
      setStatus({
        text: '已创建 backend\\.env 并尝试打开记事本。请填写密钥后保存关闭，再点「启动后台」。',
        type: 'warning',
      });
      setDockerBusy(false);
      return;
    }
    setStatus({ text: '正在执行 docker compose（可能需要几分钟）…', type: 'warning' });
    api.startDocker();
  };

  const onTryMain = async () => {
    const res = await api.tryOpenMain();
    if (res?.ok) {
      setStatus({ text: '后端已就绪，已打开主界面。', type: 'success' });
    } else {
      setStatus({
        text: '后端未就绪。请先「启动后台」并等待完成，或检查 Docker Desktop。',
        type: 'error',
      });
    }
  };

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: figmaShellLayout.shellBackground,
      }}
    >
      <Header
        style={{
          height: figmaShellLayout.headerHeight,
          lineHeight: `${figmaShellLayout.headerHeight}px`,
          padding: '0 24px',
          background: figmaShellLayout.headerBackground,
          borderBottom: `1px solid ${token.colorBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <img
          src={LOGO_SRC}
          alt=""
          width={28}
          height={28}
          style={{ borderRadius: token.borderRadiusSM, display: 'block' }}
        />
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          AAAFLOW
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          启动本地后台
        </Text>
      </Header>
      <Content style={{ padding: 24, maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <Card
          title={
            <Space>
              <ThunderboltOutlined style={{ color: token.colorPrimary }} />
              <span>准备运行环境</span>
            </Space>
          }
          bordered
          style={{ borderRadius: token.borderRadiusLG, marginBottom: 24 }}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            与主界面相同的 Ant Design 风格。在此启动 Docker 后台，无需单独打开黑色 CMD 窗口。拉镜像失败时请查看下方日志，并配置镜像加速或 VPN。
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
            {repoLine}
          </Text>
          <Space wrap size="middle">
            <Button
              type="primary"
              size="large"
              icon={<CloudUploadOutlined />}
              loading={dockerBusy}
              disabled={!repoOk}
              onClick={() => void onStartDocker()}
            >
              启动后台 (Docker)
            </Button>
            <Button size="large" icon={<CheckCircleOutlined />} onClick={() => void onTryMain()}>
              检测后端并进入应用
            </Button>
            <Button size="large" icon={<MedicineBoxOutlined />} onClick={() => void api.openEnvFile()}>
              打开 .env 配置
            </Button>
            <Button size="large" icon={<FolderOpenOutlined />} onClick={() => void api.openRepoFolder()}>
              打开项目文件夹
            </Button>
            <Button size="large" icon={<LinkOutlined />} onClick={() => void api.openMirrorHelp()}>
              镜像拉取失败？
            </Button>
          </Space>
        </Card>

        {status.text ? (
          <Alert
            style={{ marginBottom: 16, borderRadius: token.borderRadius }}
            type={status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : 'warning'}
            showIcon
            message={status.text}
          />
        ) : null}

        <Card
          size="small"
          title="Docker 输出"
          style={{ borderRadius: token.borderRadiusLG }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Input.TextArea
            readOnly
            value={log}
            placeholder="日志将显示在这里…"
            autoSize={{ minRows: 12, maxRows: 24 }}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.5,
              background: token.colorFillAlter,
              borderRadius: token.borderRadius,
            }}
          />
          <Divider style={{ margin: '12px 0 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            完成后若健康检查通过，将自动打开登录界面。
          </Text>
        </Card>
      </Content>
    </Layout>
  );
}
