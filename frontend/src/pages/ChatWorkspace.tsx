import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Layout, Input, Button, List, Avatar, Typography, Space, Card,
  Upload, Tag, Image, Tooltip, message, Divider, Drawer, Select, theme,
} from 'antd';
import {
  SendOutlined, PlusOutlined, RobotOutlined, UserOutlined,
  PictureOutlined, ThunderboltOutlined,
  MessageOutlined, LoadingOutlined, VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload';

import type {
  ChatSession, ChatSessionListItem, Skill, LlmOptionsResponse,
} from '../types';
import { MessageType } from '../types';
import { chatApi, uploadApi } from '../services/api';
import { getChatLlmPrefs, setChatLlmPrefs } from '../services/llmPrefs';
import { mediaUrl, stripMediaAuthQuery } from '../utils/mediaUrl';
import { AaaflowEmpty } from '../components/AaaflowEmpty';
import { figmaShellLayout } from '../generated/figmaShellLayout';
import { CHAT_BOOTSTRAP_SESSION_KEY } from '../utils/chatBootstrap';

const { Sider, Content } = Layout;
const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  images?: string[];
  isStreaming?: boolean;
}

interface ChatWorkspaceProps {
  /** 桌面客户端内嵌：隐藏侧栏，自动准备对话 */
  embeddedDesktop?: boolean;
}

export default function ChatWorkspace({ embeddedDesktop = false }: ChatWorkspaceProps) {
  const { token } = theme.useToken();
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [llmOptions, setLlmOptions] = useState<LlmOptionsResponse | null>(null);
  const [prefProvider, setPrefProvider] = useState(() => getChatLlmPrefs().provider);
  const [prefModel, setPrefModel] = useState(() => getChatLlmPrefs().model ?? '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const createNewSessionRef = useRef<() => Promise<void>>(async () => {});
  const loadSessionRef = useRef<(id: string) => Promise<void>>(async () => {});
  const desktopBootRef = useRef(false);
  const chatBootstrapRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stickToBottomRef.current !== nearBottom) {
      stickToBottomRef.current = nearBottom;
      setShowScrollToBottom(!nearBottom);
    }
  }, []);

  useEffect(() => {
    chatApi.listSkills().then(setSkills).catch(() => {});
  }, []);

  useEffect(() => {
    void chatApi.llmOptions().then(setLlmOptions).catch(() => {});
  }, []);

  const llmDefaultFilledRef = useRef(false);
  useEffect(() => {
    if (!llmOptions || llmDefaultFilledRef.current) return;
    llmDefaultFilledRef.current = true;
    const { provider, model } = getChatLlmPrefs();
    if (!model) {
      const dm = llmOptions.default_models[provider];
      if (dm) {
        setPrefModel(dm);
        setChatLlmPrefs(provider, dm);
      }
    }
  }, [llmOptions]);

  useEffect(() => {
    if (embeddedDesktop) return;
    chatApi.listSessions().then(setSessions).catch(() => {});
  }, [embeddedDesktop]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const streaming = messages.some((m) => m.isStreaming);
    scrollToBottom(streaming ? 'auto' : 'smooth');
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!embeddedDesktop) return;
    const onNew = () => {
      void createNewSessionRef.current();
    };
    const onHist = () => setHistoryOpen((o) => !o);
    window.addEventListener('gameart:new-chat', onNew);
    window.addEventListener('gameart:toggle-history', onHist);
    return () => {
      window.removeEventListener('gameart:new-chat', onNew);
      window.removeEventListener('gameart:toggle-history', onHist);
    };
  }, [embeddedDesktop]);

  useEffect(() => {
    if (!embeddedDesktop || desktopBootRef.current) return;
    desktopBootRef.current = true;
    void (async () => {
      try {
        const list = await chatApi.listSessions();
        setSessions(list);
        if (list.length === 0) {
          await createNewSessionRef.current();
        } else {
          await loadSessionRef.current(list[0].id);
        }
      } catch {
        /* 后台未启动时由顶部状态提示 */
      }
    })();
  }, [embeddedDesktop]);

  const loadSession = async (sessionId: string) => {
    try {
      const session = await chatApi.getSession(sessionId);
      setCurrentSession(session);
      setMessages(
        session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          type: m.message_type,
          images: m.image_urls,
        }))
      );
      stickToBottomRef.current = true;
      setShowScrollToBottom(false);
    } catch {
      message.error('加载会话失败');
    }
  };

  useEffect(() => {
    if (embeddedDesktop || chatBootstrapRef.current) return;
    let sid: string | null = null;
    try {
      sid = sessionStorage.getItem(CHAT_BOOTSTRAP_SESSION_KEY);
    } catch {
      return;
    }
    if (!sid) return;
    chatBootstrapRef.current = true;
    try {
      sessionStorage.removeItem(CHAT_BOOTSTRAP_SESSION_KEY);
    } catch {
      /* ignore */
    }
    void (async () => {
      await loadSession(sid!);
      await chatApi.listSessions().then(setSessions).catch(() => {});
      message.success('已打开与任务绑定的对话');
    })();
  }, [embeddedDesktop]);

  const createNewSession = async () => {
    try {
      const prefs = getChatLlmPrefs();
      const session = await chatApi.createSession({
        title: '新对话',
        llm_provider: prefs.provider,
        ...(prefs.model ? { llm_model: prefs.model } : {}),
      });
      setCurrentSession(session);
      setMessages([]);
      stickToBottomRef.current = true;
      setShowScrollToBottom(false);
      setSessions((prev) => [
        {
          id: session.id,
          title: session.title,
          task_id: session.task_id,
          is_active: session.is_active,
          message_count: 0,
          llm_provider: session.llm_provider,
          llm_model: session.llm_model,
          org_id: session.org_id,
          user_id: session.user_id,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        ...prev,
      ]);
    } catch {
      message.error('创建会话失败（请确认后台已配置对应 API Key）');
    }
  };

  const handlePrefProviderChange = (v: string) => {
    setPrefProvider(v);
    const next = llmOptions?.default_models[v] || '';
    setPrefModel(next);
    setChatLlmPrefs(v, next || null);
  };

  const handlePrefModelChange = (v: string | null) => {
    const m = v || '';
    setPrefModel(m);
    setChatLlmPrefs(prefProvider, m || null);
  };

  const streamAssistantReply = async (
    sessionId: string,
    userContent: string,
    imageUrls: string[],
  ) => {
    if (!userContent.trim() || sending) return;
    setSending(true);
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);

    const userMsg: StreamMessage = {
      role: 'user',
      content: userContent,
      type: MessageType.TEXT,
      images: imageUrls,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: StreamMessage = {
      role: 'assistant',
      content: '',
      type: MessageType.TEXT,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await chatApi.sendMessage(sessionId, userContent, imageUrls);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'text') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.isStreaming) {
                  last.content += event.content;
                }
                return [...updated];
              });
            } else if (event.type === 'skill_start') {
              setMessages((prev) => {
                const skill_msg: StreamMessage = {
                  role: 'assistant',
                  content: `🔧 正在调用技能: ${event.skill_id}...`,
                  type: MessageType.SKILL_INVOKE,
                  isStreaming: true,
                };
                return [...prev, skill_msg];
              });
            } else if (event.type === 'generation_result') {
              setMessages((prev) => {
                const img_msg: StreamMessage = {
                  role: 'assistant',
                  content: '',
                  type: MessageType.GENERATION_RESULT,
                  images: [event.image_url],
                };
                return [...prev, img_msg];
              });
            } else if (event.type === 'skill_done') {
              setMessages((prev) => {
                const done_msg: StreamMessage = {
                  role: 'assistant',
                  content: `已生成 ${event.count} 张图片，请查看结果。如需调整请告诉我！`,
                  type: MessageType.TEXT,
                };
                return [...prev, done_msg];
              });
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const err_msg: StreamMessage = {
                  role: 'assistant',
                  content: `❌ ${event.content}`,
                  type: MessageType.ERROR,
                };
                return [...prev, err_msg];
              });
            } else if (event.type === 'done') {
              setMessages((prev) => {
                const updated = [...prev];
                for (const m of updated) {
                  m.isStreaming = false;
                }
                return [...updated];
              });
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const hint = isAbort
        ? '请求已取消'
        : '连接已中断或服务器无响应，请检查网络与后台服务后重试';
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStreaming),
        { role: 'assistant', content: `❌ ${hint}`, type: MessageType.ERROR },
      ]);
    } finally {
      setSending(false);
      chatApi.listSessions().then(setSessions).catch(() => {});
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession || sending) return;
    const userContent = input.trim();
    const imageUrls: string[] = [];
    for (const file of fileList) {
      const ru = file.response as { url?: string; canonicalUrl?: string } | undefined;
      const ref = ru?.canonicalUrl || (ru?.url ? stripMediaAuthQuery(ru.url) : '');
      if (ref) imageUrls.push(ref);
    }
    setInput('');
    setFileList([]);
    await streamAssistantReply(currentSession.id, userContent, imageUrls);
  };

  const invokeSkillQuick = (skill: Skill) => {
    if (!currentSession) {
      message.warning('请先新建或选择对话');
      return;
    }
    if (sending) return;
    const content = `请使用技能「${skill.name}」（技能 ID: ${skill.id}）结合当前绑定任务与上下文生成图片；请按系统说明输出 skill_invoke 代码块。`;
    void streamAssistantReply(currentSession.id, content, []);
  };

  const handleUpload = async (options: { file: File; onSuccess: (body: unknown) => void; onError: (err: Error) => void }) => {
    try {
      const result = await uploadApi.upload(options.file);
      options.onSuccess({
        ...result,
        url: mediaUrl(result.url),
        canonicalUrl: result.url,
      });
    } catch (err) {
      options.onError(err as Error);
    }
  };

  const renderMessage = (msg: StreamMessage, index: number) => {
    const isUser = msg.role === 'user';

    if (msg.type === MessageType.GENERATION_RESULT && msg.images?.length) {
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 12,
            paddingLeft: 48,
          }}
        >
          <Image.PreviewGroup>
            <Space wrap>
              {msg.images.map((url, i) => (
                <Image
                  key={i}
                  src={mediaUrl(url)}
                  width={280}
                  style={{ borderRadius: token.borderRadius }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EImage%3C/text%3E%3C/svg%3E"
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        </div>
      );
    }

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
          gap: 8,
        }}
      >
        {!isUser && (
          <Avatar
            icon={<RobotOutlined />}
            style={{ background: token.colorPrimary, flexShrink: 0 }}
          />
        )}
        <div
          style={{
            maxWidth: '70%',
            padding: '10px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser ? token.colorPrimary : token.colorBgContainer,
            color: isUser ? '#fff' : token.colorText,
            boxShadow: token.boxShadowTertiary,
            border: isUser ? 'none' : `1px solid ${token.colorBorder}`,
          }}
        >
          {msg.images && msg.images.length > 0 && isUser && (
            <Space wrap style={{ marginBottom: 8 }}>
              {msg.images.map((url, i) => (
                <Image key={i} src={mediaUrl(url)} width={80} style={{ borderRadius: token.borderRadiusXS }} />
              ))}
            </Space>
          )}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {msg.content}
            {msg.isStreaming && <LoadingOutlined style={{ marginLeft: 4 }} />}
          </div>
          {msg.type === MessageType.SKILL_INVOKE && (
            <Tag color="processing" style={{ marginTop: 4 }}>
              <ThunderboltOutlined /> 技能调用中
            </Tag>
          )}
        </div>
        {isUser && (
          <Avatar
            icon={<UserOutlined />}
            style={{ background: token.colorSuccess, flexShrink: 0 }}
          />
        )}
      </div>
    );
  };

  createNewSessionRef.current = createNewSession;
  loadSessionRef.current = loadSession;

  const selectSession = (id: string) => {
    void loadSession(id);
    if (embeddedDesktop) setHistoryOpen(false);
  };

  const sessionSidebarInner = (
    <>
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={createNewSession}
          block
        >
          新建对话
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        <List
          dataSource={sessions}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              onClick={() => selectSession(item.id)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: token.borderRadius,
                  marginBottom: 4,
                  background: currentSession?.id === item.id ? token.colorPrimaryBg : 'transparent',
                  border: 'none',
                }}
              >
                <List.Item.Meta
                  avatar={<MessageOutlined style={{ marginTop: 4 }} />}
                  title={
                    <Text ellipsis style={{ fontSize: 13, maxWidth: 180 }}>
                      {item.title}
                    </Text>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.message_count} 条消息
                      </Text>
                      {(item.llm_provider || item.llm_model) && (
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {[item.llm_provider, item.llm_model].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: <AaaflowEmpty description="暂无对话" /> }}
          />
        </div>

        {/* Skills panel */}
        <div style={{ padding: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Text strong style={{ fontSize: 12 }}>可用技能</Text>
          <Paragraph type="secondary" style={{ fontSize: 11, margin: '6px 0 8px' }}>
            点击即发送调用请求（模型将输出 skill_invoke）
          </Paragraph>
          <div style={{ marginTop: 4, maxHeight: 240, overflow: 'auto' }}>
            {skills.map((skill) => (
              <Tooltip key={skill.id} title={skill.description}>
                <Button
                  type="default"
                  size="small"
                  block
                  style={{ marginBottom: 6, textAlign: 'left', height: 'auto', padding: '6px 8px' }}
                  icon={<ThunderboltOutlined />}
                  onClick={() => invokeSkillQuick(skill)}
                  disabled={sending}
                >
                  <span style={{ fontSize: 12 }}>{skill.name}</span>
                </Button>
              </Tooltip>
            ))}
          </div>
        </div>
    </>
  );

  return (
    <Layout
      style={{
        height: embeddedDesktop ? '100%' : `calc(100vh - ${figmaShellLayout.headerHeight}px)`,
        background: token.colorBgContainer,
      }}
    >
      {!embeddedDesktop && (
        <Sider
          width={280}
          style={{
            background: token.colorFillAlter,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {sessionSidebarInner}
        </Sider>
      )}

      {embeddedDesktop && (
        <Drawer
          title="历史对话与技能"
          placement="left"
          width={300}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            {sessionSidebarInner}
          </div>
        </Drawer>
      )}

      <Content style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {!currentSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AaaflowEmpty
              description={
                <Space direction="vertical" align="center">
                  <Text style={{ fontSize: 16 }}>AAAFLOW 美术助手</Text>
                  <Text type="secondary">
                    {embeddedDesktop
                      ? '请先双击「启动AAAFLOW.bat」启动后台（需先装小鲸鱼 Docker Desktop），并填写 backend 里 .env 的密钥'
                      : '选择一个对话或创建新对话开始使用'}
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={createNewSession}>
                    开始新对话
                  </Button>
                </Space>
              }
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space wrap align="center">
                <RobotOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                <Text strong>{currentSession.title}</Text>
                {currentSession.llm_provider && (
                  <Tag color="blue" style={{ margin: 0 }}>
                    {currentSession.llm_provider}
                    {currentSession.llm_model ? ` · ${currentSession.llm_model}` : ''}
                  </Tag>
                )}
              </Space>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <div
                ref={messagesScrollRef}
                onScroll={onMessagesScroll}
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '20px 24px',
                  background: token.colorFillAlter,
                }}
              >
              {messages.length === 0 && (
                <Card
                  style={{
                    maxWidth: 600,
                    margin: '40px auto',
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorder}`,
                    boxShadow: token.boxShadowTertiary,
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 16 }}>
                      <RobotOutlined style={{ marginRight: 8 }} />
                      你好！我是 AAAFLOW 美术助手
                    </Text>
                    <Paragraph type="secondary">
                      告诉我你的美术需求，我会分析并推荐最合适的生成方案。你可以：
                    </Paragraph>
                    <ul style={{ paddingLeft: 20, color: token.colorTextSecondary }}>
                      <li>描述你需要的美术资源（角色、场景、图标等）</li>
                      <li>上传参考图片</li>
                      <li>我会分析需求并推荐合适的技能</li>
                      <li>确认后自动生成AI图片</li>
                      <li>根据你的反馈持续优化</li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      示例: "我需要一个Q版女战士角色，动漫风格，手持火焰长剑，白色背景"
                    </Text>
                  </Space>
                </Card>
              )}
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
              </div>
              {showScrollToBottom && messages.length > 0 && (
                <Button
                  type="primary"
                  shape="circle"
                  size="small"
                  icon={<VerticalAlignBottomOutlined />}
                  aria-label="回到底部"
                  onClick={() => {
                    stickToBottomRef.current = true;
                    setShowScrollToBottom(false);
                    scrollToBottom('smooth');
                  }}
                  style={{
                    position: 'absolute',
                    right: 20,
                    bottom: 12,
                    zIndex: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}
                />
              )}
            </div>

            {/* Input area */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
              }}
            >
              <Space wrap style={{ marginBottom: 10 }} align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  新对话默认
                </Text>
                <Select
                  size="small"
                  style={{ width: 148 }}
                  value={prefProvider}
                  options={(llmOptions?.providers ?? []).map((p) => ({
                    value: p.id,
                    label: p.available ? p.label : `${p.label}（未配置）`,
                    disabled: !p.available,
                  }))}
                  onChange={handlePrefProviderChange}
                />
                <Select
                  size="small"
                  style={{ width: 200 }}
                  showSearch
                  allowClear
                  placeholder="模型（清空=服务端默认）"
                  value={prefModel || undefined}
                  options={(llmOptions?.providers ?? [])
                    .find((p) => p.id === prefProvider)
                    ?.models.map((m) => ({ value: m.id, label: m.label }))}
                  onChange={(v) => handlePrefModelChange(v ?? null)}
                  optionFilterProp="label"
                />
              </Space>
              {fileList.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Upload
                    listType="picture"
                    fileList={fileList}
                    onChange={({ fileList: fl }) => setFileList(fl)}
                    customRequest={handleUpload as never}
                    accept="image/*"
                  />
                </div>
              )}
              <Space.Compact style={{ width: '100%' }}>
                <Upload
                  showUploadList={false}
                  customRequest={handleUpload as never}
                  accept="image/*"
                  onChange={({ fileList: fl }) => setFileList(fl)}
                  fileList={fileList}
                  multiple
                >
                  <Button icon={<PictureOutlined />} style={{ height: 44 }} />
                </Upload>
                <TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        if (!file) continue;
                        const uid = `paste-${Date.now()}-${i}`;
                        const entry: UploadFile = { uid, name: file.name || 'paste.png', status: 'uploading', originFileObj: file as never };
                        setFileList((prev) => [...prev, entry]);
                        uploadApi.upload(file).then((res) => {
                          setFileList((prev) =>
                            prev.map((f) =>
                              f.uid === uid
                                ? { ...f, status: 'done' as const, response: { ...res, url: mediaUrl(res.url), canonicalUrl: res.url } }
                                : f,
                            ),
                          );
                          message.success('已粘贴参考图');
                        }).catch(() => {
                          setFileList((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: 'error' as const } : f)));
                          message.error('粘贴图片上传失败');
                        });
                        break;
                      }
                    }
                  }}
                  placeholder="描述你的美术需求，可以附上参考图片（支持粘贴）..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ flex: 1 }}
                  disabled={sending}
                />
                <Button
                  type="primary"
                  icon={sending ? <LoadingOutlined /> : <SendOutlined />}
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  style={{ height: 44, width: 44 }}
                />
              </Space.Compact>
            </div>
          </>
        )}
      </Content>
    </Layout>
  );
}
