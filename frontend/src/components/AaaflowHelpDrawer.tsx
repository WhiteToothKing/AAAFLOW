import { Button, Drawer, Typography } from 'antd';

const { Text, Paragraph } = Typography;

const DOCKER_DESKTOP_URL = 'https://www.docker.com/products/docker-desktop/';

interface AaaflowHelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** 桌面与 Web 共用的入门说明（Docker、启动脚本、.env、设置入口） */
export function AaaflowHelpDrawer({ open, onClose }: AaaflowHelpDrawerProps) {
  return (
    <Drawer
      title="使用说明（不懂 Docker 也能照着做）"
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
    >
      <Paragraph>
        <Text strong>Docker 是什么？</Text>
        把它当成要装在电脑上的免费软件，图标是<Text strong>小鲸鱼</Text>，名字叫
        <Text code> Docker Desktop </Text>。
        装好后，AAAFLOW 的「后台」才能在本机跑起来。
        <Text type="secondary"> 装一次、打开它即可。</Text>
      </Paragraph>
      <Paragraph>
        <Button type="primary" href={DOCKER_DESKTOP_URL} target="_blank" rel="noreferrer">
          打开 Docker Desktop 下载页
        </Button>
      </Paragraph>
      <Paragraph>
        <Text strong>接下来：</Text>
      </Paragraph>
      <ol style={{ paddingLeft: 18, lineHeight: 1.85 }}>
        <li>安装并打开 Docker Desktop，等完全启动。</li>
        <li>双击 <Text code>启动AAAFLOW.bat</Text>（或 <Text code>AAAFLOW.bat</Text>）。</li>
        <li>
          编辑 <Text code>backend/.env</Text>：对话至少配置{' '}
          <Text code>ANTHROPIC_API_KEY</Text> 或 <Text code>OPENAI_API_KEY</Text>（可在顶部「设置」里切换默认提供方与模型）。
        </li>
        <li>使用工作台、对话与任务功能。</li>
      </ol>
      <Paragraph type="secondary" style={{ fontSize: 13 }}>
        更白话说明见仓库根目录 <Text code>AAAFLOW-小白必读.txt</Text>；私有化部署见{' '}
        <Text code>docs/PRIVATE_DEPLOY.md</Text>。
      </Paragraph>
      <Paragraph>
        <Text strong>接口地址</Text> 在「设置」中可改，须为带 <Text code>/api</Text> 后缀的根路径，例如{' '}
        <Text code>http://127.0.0.1:8000/api</Text>（与登录页「API 根地址」一致）。
      </Paragraph>
    </Drawer>
  );
}
