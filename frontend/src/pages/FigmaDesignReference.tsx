import { useState, useMemo } from 'react';
import { Typography, Alert, Image, Table, Tag, Space, Button } from 'antd';
import { ExportOutlined, LayoutOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { ColumnsType } from 'antd/es/table';

import { designTokens } from '../designTokens';
import {
  figmaFeatureMatrix,
  FIGMA_PARITY_TIER_LABEL,
  type FigmaParityTier,
} from '../config/figmaFeatureMatrix';
import {
  FIGMA_CONTENT_MAX_WIDTH_PX,
  FIGMA_DESIGN_FILE_KEY,
  FIGMA_DESIGN_URL,
  FIGMA_NODE_LOGIN_SHARED,
  figmaFileUrl,
} from '../config/figmaProject';
import { figmaShellLayout } from '../generated/figmaShellLayout';

const PNG_MAIN = `${import.meta.env.BASE_URL}figma/aaaflow-main-shell.png`;
const PNG_SCREENS = `${import.meta.env.BASE_URL}figma/aaaflow-client-screens.png`;
const { antdToken: dt } = designTokens;

const TIER_TAG: Record<FigmaParityTier, string> = {
  'shell-synced': 'blue',
  'pro-page': 'green',
  'custom-page': 'orange',
  'dev-only': 'default',
};

export default function FigmaDesignReference() {
  const [mainFailed, setMainFailed] = useState(false);
  const [screensFailed, setScreensFailed] = useState(false);

  const columns: ColumnsType<(typeof figmaFeatureMatrix)[number]> = useMemo(
    () => [
      { title: '路由', dataIndex: 'path', key: 'path', width: 128, render: (p) => <Typography.Text code>{p}</Typography.Text> },
      { title: '页面', dataIndex: 'title', key: 'title', width: 108 },
      {
        title: '应用端',
        dataIndex: 'appImplemented',
        key: 'appImplemented',
        width: 76,
        render: (v: boolean) => (v ? <Tag color="success">已落地</Tag> : <Tag>未实现</Tag>),
      },
      {
        title: 'Figma 建帧',
        dataIndex: 'figmaFrameRecommended',
        key: 'figmaFrameRecommended',
        width: 96,
        render: (v: boolean) =>
          v ? <Tag color="processing">建议</Tag> : <Tag color="default">—</Tag>,
      },
      { title: 'Figma 建议帧名', dataIndex: 'figmaSuggestedFrame', key: 'figmaSuggestedFrame', ellipsis: true },
      {
        title: '代码落地方式',
        dataIndex: 'tier',
        key: 'tier',
        width: 128,
        render: (tier: FigmaParityTier) => (
          <Tag color={TIER_TAG[tier]}>{FIGMA_PARITY_TIER_LABEL[tier]}</Tag>
        ),
      },
      { title: '说明', dataIndex: 'notes', key: 'notes', ellipsis: true },
    ],
    [],
  );

  return (
    <PageContainer
      ghost
      breadcrumbRender={false}
      title={
        <Space>
          <LayoutOutlined />
          设计对照
        </Space>
      }
      subTitle="功能路由与 Figma 画布命名建议 · 壳层与 PNG 同步说明"
      extra={
        <Space wrap>
          <Button type="primary" href={FIGMA_DESIGN_URL} target="_blank" rel="noreferrer" icon={<ExportOutlined />}>
            在 Figma 中打开设计文件
          </Button>
          <Button href={figmaFileUrl(FIGMA_NODE_LOGIN_SHARED)} target="_blank" rel="noreferrer" icon={<ExportOutlined />}>
            打开登录页节点
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        官方文件：{' '}
        <Typography.Link href={FIGMA_DESIGN_URL} target="_blank" rel="noreferrer">
          AAAFLOW-Design
        </Typography.Link>
        （file key <Typography.Text code>{FIGMA_DESIGN_FILE_KEY}</Typography.Text>
        ）；REST 同步仍需在本机配置 <Typography.Text code>FIGMA_ACCESS_TOKEN</Typography.Text>。
      </Typography.Paragraph>
      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 12 }}
        message="应用端（客户端）"
        description="下表所列路由在程序里均有可交互页面，与侧栏菜单一致；主内容区常见最大宽度可走查约 1320px（FIGMA_CONTENT_MAX_WIDTH_PX）。"
      />
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Figma 画布是否「一一对应」？是否「完整像素还原」？"
        description={
          <>
            <strong>一一对应</strong>：仅当文件中为每个「建议建帧」的功能都建有可识别 Frame，并与命名大致一致时，设计稿才算与功能清单对齐；表中「Figma 建帧」为「—」的项不要求单独画板。
            <br />
            <strong>完整还原</strong>：主壳与 <Typography.Text code>figma:sync</Typography.Text> PNG 可对齐；业务页为 Ant Design 实现，与稿为<strong>结构 / Token 级</strong>一致，不承诺整站逐像素 1:1（详见 docs/DESIGN_PARITY.md）。
          </>
        }
      />
      <Typography.Paragraph>
        <strong>可交互界面</strong>即产品落地：侧栏入口与路由一一对应下表；壳层量来自{' '}
        <Typography.Text code>figmaShellLayout</Typography.Text>。
      </Typography.Paragraph>
      <div style={{ maxWidth: FIGMA_CONTENT_MAX_WIDTH_PX }}>
        <Table
          size="small"
          rowKey="path"
          columns={columns}
          dataSource={figmaFeatureMatrix}
          pagination={false}
          style={{ marginBottom: 24 }}
          scroll={{ x: 1100 }}
        />
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="如何更新参照图"
        description="配置 FIGMA_ACCESS_TOKEN（必填）；FIGMA_FILE_KEY 默认与官方稿一致（见 scripts/figma.env.example）；可选 FIGMA_CLIENT_SCREENS_NODE_ID。在 frontend 目录执行 npm run figma:sync，或手动替换 public/figma/ 下文件。详见 docs/FIGMA_TO_APP_PIPELINE.md。"
      />
      <Typography.Title level={5}>主界面壳（Desktop Shell）</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        当前 <Typography.Text code>figmaShellLayout.sourceNodeId</Typography.Text>：{' '}
        <Typography.Text code>{figmaShellLayout.sourceNodeId}</Typography.Text> →{' '}
        <Typography.Text code>aaaflow-main-shell.png</Typography.Text>
        （由 <Typography.Text code>FIGMA_SHELL_NODE_ID</Typography.Text> 与{' '}
        <Typography.Text code>npm run figma:sync</Typography.Text> 生成；与官方稿不一致时请改 .env 后重新同步。）
      </Typography.Paragraph>
      {mainFailed ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          message="主壳 PNG 缺失或路径不对"
          description="运行 npm run figma:sync，或将导出图保存为 public/figma/aaaflow-main-shell.png。"
        />
      ) : (
        <Image
          src={PNG_MAIN}
          alt="Figma AAAFLOW Desktop Shell"
          style={{
            maxWidth: '100%',
            marginBottom: 32,
            border: `1px solid ${dt.colorBorder}`,
            borderRadius: dt.borderRadius,
          }}
          onError={() => setMainFailed(true)}
        />
      )}

      <Typography.Title level={5}>功能界面整页（客户端对照画布）</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        可选节点 <Typography.Text code>FIGMA_CLIENT_SCREENS_NODE_ID</Typography.Text>（默认示例{' '}
        <Typography.Text code>131:283849</Typography.Text>）→{' '}
        <Typography.Text code>aaaflow-client-screens.png</Typography.Text>
      </Typography.Paragraph>
      {screensFailed ? (
        <Alert
          type="info"
          showIcon
          message="功能界面整页 PNG 未生成"
          description="在 .env 中设置 FIGMA_CLIENT_SCREENS_NODE_ID=131:283849（或你的画布页节点 id）后执行 npm run figma:sync。"
        />
      ) : (
        <Image
          src={PNG_SCREENS}
          alt="Figma AAAFLOW client screens reference page"
          style={{
            maxWidth: '100%',
            border: `1px solid ${dt.colorBorder}`,
            borderRadius: dt.borderRadius,
          }}
          onError={() => setScreensFailed(true)}
        />
      )}
    </PageContainer>
  );
}
