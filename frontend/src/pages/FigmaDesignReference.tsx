import { useState } from 'react';
import { Typography, Alert, Image } from 'antd';

import { designTokens } from '../designTokens';

const PNG_MAIN = `${import.meta.env.BASE_URL}figma/aaaflow-main-shell.png`;
const PNG_SCREENS = `${import.meta.env.BASE_URL}figma/aaaflow-client-screens.png`;
const { antdToken: dt } = designTokens;

export default function FigmaDesignReference() {
  const [mainFailed, setMainFailed] = useState(false);
  const [screensFailed, setScreensFailed] = useState(false);

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        设计对照（产品已落地 + Figma 静态参照）
      </Typography.Title>
      <Typography.Paragraph>
        <strong>可交互界面</strong>即为设计落地：通过侧栏进入工作台、AI 对话、提交需求、任务列表等；桌面壳的侧栏宽、顶栏高与大面积背景色来自{' '}
        <Typography.Text code>figmaShellLayout</Typography.Text>（运行{' '}
        <Typography.Text code>npm run figma:sync</Typography.Text> 与 Figma 主壳节点对齐）。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        下方 PNG 由 Figma API 导出，用于和画布逐屏对比像素与版式；业务数据、表单与列表行为以当前应用为准。
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="如何更新参照图"
        description="配置 FIGMA_ACCESS_TOKEN、FIGMA_FILE_KEY（及可选 FIGMA_CLIENT_SCREENS_NODE_ID）后，在 frontend 目录执行 npm run figma:sync，或手动替换 public/figma/ 下文件。详见 docs/FIGMA_TO_APP_PIPELINE.md。"
      />
      <Typography.Title level={5}>主界面壳（Page 1 · Desktop Shell）</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        默认节点 <Typography.Text code>20:263496</Typography.Text> →{' '}
        <Typography.Text code>aaaflow-main-shell.png</Typography.Text>
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
    </div>
  );
}
