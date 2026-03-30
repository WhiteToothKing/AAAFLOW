import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Steps, Button, Form, Input, Upload, Space, message, Typography, Select, InputNumber,
  Row, Col, Checkbox, Card, Alert, Spin, Divider, Tag,
} from 'antd';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import {
  FormOutlined, SearchOutlined, CheckCircleOutlined, MessageOutlined,
  PictureOutlined, ThunderboltOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  ApiOutlined, CloudServerOutlined,
} from '@ant-design/icons';

import {
  ArtType, ArtStyle, GenerationMode, GenerationProvider,
  ART_TYPE_LABELS, ART_STYLE_LABELS,
  PROVIDER_LABELS, COMPLEXITY_LABELS,
} from '../types';
import type { AnalyzeResponse, TaskCreatePayload, Skill } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { uploadApi, analyzeApi, chatApi } from '../services/api';
import { getChatLlmPrefs } from '../services/llmPrefs';
import { mediaUrl, stripMediaAuthQuery } from '../utils/mediaUrl';
import { setChatBootstrapSessionId } from '../utils/chatBootstrap';
import { designTokens } from '../designTokens';
import { mainColumnMaxWidth } from '../utils/clientChrome';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;
const { antdToken: dt } = designTokens;

function isSkillComfyMode(mode: string): boolean {
  return String(mode).toLowerCase() === GenerationMode.COMFYUI;
}

export default function DemandWizard() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createTask, loading: taskLoading } = useTaskStore();

  const [step, setStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [pickedSkillIds, setPickedSkillIds] = useState<string[]>([]);

  const recommendedSkills: Skill[] = analysisResult?.recommended_skills ?? [];

  const toggleSkill = (id: string, checked: boolean) => {
    setPickedSkillIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const collectReferenceUrls = (): string[] => {
    const referenceImages: string[] = [];
    for (const file of fileList) {
      const ru = file.response as { url?: string; canonicalUrl?: string } | undefined;
      const ref = ru?.canonicalUrl || (ru?.url ? stripMediaAuthQuery(ru.url) : '');
      if (ref) referenceImages.push(ref);
    }
    return referenceImages;
  };

  const runAnalyze = async () => {
    try {
      const values = await form.validateFields(['title', 'description']);
      setAnalyzing(true);
      setAnalysisResult(null);
      const referenceImages = collectReferenceUrls();
      const result = await analyzeApi.analyze({
        title: values.title as string,
        description: values.description as string,
        reference_images: referenceImages,
        tags,
        width: form.getFieldValue('width') as number | undefined,
        height: form.getFieldValue('height') as number | undefined,
      });
      setAnalysisResult(result);
      const rec = result.recommended_skills ?? [];
      setPickedSkillIds(rec.length > 0 ? rec.slice(0, 4).map((s) => s.id) : []);
      if (result.analysis.tags?.length && tags.length === 0) {
        setTags(result.analysis.tags);
      }
      if (!form.getFieldValue('art_type')) {
        form.setFieldValue('art_type', result.analysis.art_type);
      }
      if (!form.getFieldValue('art_style')) {
        form.setFieldValue('art_style', result.analysis.art_style);
      }
      if (!form.getFieldValue('width') && result.analysis.recommended_size) {
        form.setFieldValue('width', result.analysis.recommended_size.width);
      }
      if (!form.getFieldValue('height') && result.analysis.recommended_size) {
        form.setFieldValue('height', result.analysis.recommended_size.height);
      }
      message.success('分析完成，请查看推荐技能与路由说明');
      setStep(1);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('分析失败，请检查网络、登录与 API 配置');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload: NonNullable<UploadProps['customRequest']> = async (options) => {
    const { file, onSuccess, onError } = options;
    if (!(file instanceof File)) {
      onError?.(new Error('无效文件'));
      return;
    }
    try {
      const result = await uploadApi.upload(file);
      onSuccess?.({
        ...result,
        url: mediaUrl(result.url),
        canonicalUrl: result.url,
      });
    } catch (e) {
      onError?.(e as Error);
      message.error('图片上传失败');
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const canGoStep2 = analysisResult !== null;
  const stepItems = useMemo(
    () => [
      { title: '需求与参考', icon: <FormOutlined /> },
      { title: 'AI 分析', icon: <SearchOutlined /> },
      { title: '确认参数', icon: <CheckCircleOutlined /> },
      { title: '创建并对话', icon: <MessageOutlined /> },
    ],
    [],
  );

  const buildCreatePayload = async (): Promise<TaskCreatePayload> => {
    const values = await form.validateFields();
    const referenceImages = collectReferenceUrls();
    const ar = analysisResult!;
    const genProvider = values.generation_provider as GenerationProvider | undefined;
    return {
      title: values.title as string,
      description: values.description as string,
      art_type: (values.art_type as ArtType) || ar.analysis.art_type,
      art_style: (values.art_style as ArtStyle) || ar.analysis.art_style,
      generation_mode: (values.generation_mode as GenerationMode) || ar.analysis.recommended_mode,
      width: (values.width as number) || ar.analysis.recommended_size?.width,
      height: (values.height as number) || ar.analysis.recommended_size?.height,
      num_variations: (values.num_variations as number) || 4,
      reference_images: referenceImages,
      tags: tags.length > 0 ? tags : ar.analysis.tags,
      priority: (values.priority as number) || 0,
      ...(genProvider ? { generation_provider: genProvider } : {}),
    };
  };

  const finishAndOpenChat = async () => {
    try {
      setCreating(true);
      const payload = await buildCreatePayload();
      const task = await createTask(payload);
      const lp = getChatLlmPrefs();
      let llmProvider = lp.provider;
      let llmModel = lp.model ?? '';
      const lo = await chatApi.llmOptions().catch(() => null);
      if (lo) {
        llmProvider = lo.default_provider;
        llmModel = lo.default_models[lo.default_provider] || llmModel;
      }
      const session = await chatApi.createSession({
        title: task.title.slice(0, 80),
        task_id: task.id,
        llm_provider: llmProvider,
        ...(llmModel ? { llm_model: llmModel } : {}),
      });
      const skillHint =
        pickedSkillIds.length > 0
          ? `建议在对话中优先尝试技能：${pickedSkillIds.join('、')}。`
          : '';
      setChatBootstrapSessionId(session.id);
      message.success(`任务已创建。${skillHint}正在打开 AI 对话…`);
      navigate('/chat');
    } catch {
      message.error('创建失败，请检查网络与登录');
    } finally {
      setCreating(false);
    }
  };

  const finishAndGenerate = async () => {
    try {
      setCreating(true);
      const base = await buildCreatePayload();
      const task = await createTask({ ...base, auto_process: true });
      const skillHint =
        pickedSkillIds.length > 0
          ? `已记录技能偏好：${pickedSkillIds.join('、')}。`
          : '';
      message.success(`任务已创建。${skillHint}正在进入任务页…`);
      navigate(`/tasks/${task.id}`);
    } catch {
      message.error('创建失败，请检查网络与登录');
    } finally {
      setCreating(false);
    }
  };

  const quickGenerateSkipParams = async () => {
    try {
      await form.validateFields(['title', 'description']);
      setCreating(true);
      const ar = analysisResult!;
      const values = form.getFieldsValue();
      const referenceImages = collectReferenceUrls();
      const genProvider = values.generation_provider as GenerationProvider | undefined;
      const payload: TaskCreatePayload = {
        title: values.title as string,
        description: values.description as string,
        art_type: (values.art_type as ArtType) || ar.analysis.art_type,
        art_style: (values.art_style as ArtStyle) || ar.analysis.art_style,
        generation_mode: (values.generation_mode as GenerationMode) || ar.analysis.recommended_mode,
        width: (values.width as number) || ar.analysis.recommended_size?.width,
        height: (values.height as number) || ar.analysis.recommended_size?.height,
        num_variations: (values.num_variations as number) ?? 4,
        reference_images: referenceImages,
        tags: tags.length > 0 ? tags : ar.analysis.tags,
        priority: (values.priority as number) ?? 0,
        ...(genProvider ? { generation_provider: genProvider } : {}),
        auto_process: true,
      };
      const task = await createTask(payload);
      message.success('任务已创建，正在生成…');
      navigate(`/tasks/${task.id}`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('创建失败，请检查网络与登录');
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageContainer
      ghost
      style={{ maxWidth: mainColumnMaxWidth(), margin: '0 auto' }}
      title={
        <Space>
          <ThunderboltOutlined />
          需求向导（SOP）
        </Space>
      }
      subTitle="按步骤完成：填写 → 分析 → 确认 → 一键进入绑定任务的对话"
    >
      <ProCard bordered style={{ borderRadius: dt.borderRadiusLG }} bodyStyle={{ padding: '24px 32px' }}>
        <Steps current={step} items={stepItems} style={{ marginBottom: 28 }} />

        <Form
          form={form}
          layout="vertical"
          initialValues={{ num_variations: 4, priority: 0 }}
          requiredMark="optional"
        >
          {step === 0 && (
            <>
              <Form.Item
                name="title"
                label="需求标题"
                rules={[
                  { required: true, whitespace: true, message: '请填写标题' },
                  { max: 200, message: '标题过长' },
                ]}
              >
                <Input size="large" placeholder="例如：主界面图标套装 — 扁平科技风" prefix={<FormOutlined />} />
              </Form.Item>
              <Form.Item
                name="description"
                label="需求描述"
                rules={[{ required: true, whitespace: true, message: '请描述交付物与约束' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="说明用途、风格参考、分辨率要求、禁忌等（可直接粘贴参考图）"
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        if (!file || fileList.length >= 8) break;
                        const uid = `paste-${Date.now()}-${i}`;
                        const entry: UploadFile = { uid, name: file.name || 'paste.png', status: 'uploading' as const };
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
                          setFileList((prev) => prev.filter((f) => f.uid !== uid));
                          message.error('粘贴图片上传失败');
                        });
                        break;
                      }
                    }
                  }}
                />
              </Form.Item>
              <Form.Item label="参考图（可选）">
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  customRequest={handleUpload}
                  onChange={({ fileList: fl }) => setFileList(fl)}
                  multiple
                  accept="image/*"
                >
                  {fileList.length < 8 ? (
                    <div>
                      <PictureOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  ) : null}
                </Upload>
              </Form.Item>
              <Space wrap>
                <Input
                  style={{ width: 220 }}
                  placeholder="标签回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onPressEnter={addTag}
                />
                <Button onClick={addTag}>添加标签</Button>
                {tags.map((t) => (
                  <Tag key={t} closable onClose={() => setTags(tags.filter((x) => x !== t))}>
                    {t}
                  </Tag>
                ))}
              </Space>
              <Form.Item
                name="generation_provider"
                label="首选生成提供方（可选）"
                tooltip="留空则由分析结果与路由自动选择（如 DALL-E、即梦、ComfyUI 等）"
              >
                <Select
                  allowClear
                  placeholder="不指定，由系统自动路由"
                  options={(Object.keys(PROVIDER_LABELS) as GenerationProvider[]).map((p) => ({
                    value: p,
                    label: PROVIDER_LABELS[p],
                  }))}
                />
              </Form.Item>
              <Divider />
              <Space>
                <Button type="primary" size="large" loading={analyzing} onClick={() => void runAnalyze()}>
                  下一步：AI 分析
                </Button>
              </Space>
            </>
          )}

          {step === 1 && analysisResult && (
            <>
              <Alert
                type="success"
                showIcon
                message="分析结果"
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text>
                      类型 {ART_TYPE_LABELS[analysisResult.analysis.art_type]} · 风格{' '}
                      {ART_STYLE_LABELS[analysisResult.analysis.art_style]} · 复杂度{' '}
                      {COMPLEXITY_LABELS[analysisResult.analysis.complexity] ?? analysisResult.analysis.complexity}
                    </Text>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {analysisResult.analysis.reasoning}
                    </Paragraph>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              />
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card size="small" title="生成路由">
                    <Text type="secondary">
                      模式：{analysisResult.routing.mode} · 提供方：{' '}
                      {PROVIDER_LABELS[analysisResult.routing.provider as keyof typeof PROVIDER_LABELS] ??
                        analysisResult.routing.provider}
                    </Text>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                      {analysisResult.routing.reason}
                    </Paragraph>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card size="small" title="优化提示词（节选）">
                    <Paragraph ellipsis={{ rows: 4 }} style={{ marginBottom: 0 }}>
                      {analysisResult.analysis.optimized_prompt}
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
              <Divider orientation="left">推荐技能（勾选后将作为对话提示）</Divider>
              {recommendedSkills.length === 0 ? (
                <Text type="secondary">暂无匹配项，可在对话中让 AI 自行选择技能。</Text>
              ) : (
                <Row gutter={[16, 16]}>
                  {recommendedSkills.map((s) => {
                    const comfy = isSkillComfyMode(s.mode);
                    const providerLabel =
                      PROVIDER_LABELS[s.provider as GenerationProvider] ?? s.provider;
                    const modeTag = comfy ? 'ComfyUI' : 'API';
                    return (
                      <Col xs={24} sm={12} lg={8} key={s.id}>
                        <Card
                          size="small"
                          hoverable
                          styles={{
                            body: {
                              padding: 16,
                              display: 'flex',
                              gap: 14,
                              alignItems: 'flex-start',
                            },
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: dt.borderRadius,
                              background: comfy ? 'rgba(114, 46, 209, 0.08)' : 'rgba(22, 119, 255, 0.08)',
                              color: comfy ? '#722ed1' : dt.colorPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              flexShrink: 0,
                            }}
                          >
                            {comfy ? <CloudServerOutlined /> : <ApiOutlined />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Checkbox
                              checked={pickedSkillIds.includes(s.id)}
                              onChange={(e) => toggleSkill(s.id, e.target.checked)}
                              style={{ alignItems: 'flex-start' }}
                            >
                              <Text strong style={{ display: 'block' }}>
                                {s.name}
                              </Text>
                            </Checkbox>
                            <Space size={[4, 4]} wrap style={{ marginTop: 8, marginBottom: 8 }}>
                              <Tag color="blue">{providerLabel}</Tag>
                              <Tag color={comfy ? 'purple' : 'geekblue'}>{modeTag}</Tag>
                            </Space>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                              {s.description}
                            </Paragraph>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
              <Divider />
              <Space wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
                  上一步
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={creating || taskLoading}
                  disabled={!canGoStep2}
                  onClick={() => void quickGenerateSkipParams()}
                >
                  快速生成
                </Button>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  disabled={!canGoStep2}
                  onClick={() => {
                    if (!form.getFieldValue('generation_mode')) {
                      form.setFieldValue('generation_mode', analysisResult.analysis.recommended_mode);
                    }
                    setStep(2);
                  }}
                >
                  下一步：确认参数
                </Button>
              </Space>
            </>
          )}

          {step === 2 && analysisResult && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="art_type" label="美术类型">
                    <Select
                      options={Object.entries(ART_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="art_style" label="风格">
                    <Select
                      options={Object.entries(ART_STYLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="generation_mode" label="生成模式">
                    <Select
                      options={[
                        { value: GenerationMode.API, label: 'API 生图' },
                        { value: GenerationMode.COMFYUI, label: 'ComfyUI' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="width" label="宽">
                    <InputNumber min={256} max={4096} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="height" label="高">
                    <InputNumber min={256} max={4096} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="num_variations" label="候选数量">
                    <InputNumber min={1} max={8} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="priority" label="优先级">
                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider />
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(1)}>
                  上一步
                </Button>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => setStep(3)}>
                  下一步：创建任务
                </Button>
              </Space>
            </>
          )}

          {step === 3 && analysisResult && (
            <>
              <Alert
                type="info"
                showIcon
                message="即将创建任务并打开对话"
                description="对话将绑定到新任务，可在侧栏使用「可用技能」一键发起生成。"
                style={{ marginBottom: 16 }}
              />
              <Card size="small" title="摘要">
                <Paragraph>
                  <Text strong>{form.getFieldValue('title')}</Text>
                </Paragraph>
                <Text type="secondary">
                  技能提示：{pickedSkillIds.length ? pickedSkillIds.join('、') : '（未勾选，可在对话中说明）'}
                </Text>
              </Card>
              <Divider />
              <Space wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(2)}>
                  上一步
                </Button>
                <Button
                  type="primary"
                  size="large"
                  loading={creating || taskLoading}
                  icon={<MessageOutlined />}
                  onClick={() => void finishAndOpenChat()}
                >
                  创建任务并进入 AI 对话
                </Button>
                <Button
                  size="large"
                  loading={creating || taskLoading}
                  icon={<ThunderboltOutlined />}
                  onClick={() => void finishAndGenerate()}
                >
                  一键生成（跳过对话）
                </Button>
              </Space>
            </>
          )}
        </Form>

        {analyzing && step === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin tip="正在调用分析服务…" />
          </div>
        ) : null}
      </ProCard>
    </PageContainer>
  );
}
