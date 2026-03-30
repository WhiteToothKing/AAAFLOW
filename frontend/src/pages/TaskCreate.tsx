import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Input, Select, InputNumber, Button,
  Upload, Tag, Space, Row, Col, message, Divider, Typography,
  Descriptions, Spin, Alert, Steps,
} from 'antd';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  PlusOutlined, RocketOutlined,
  PictureOutlined, BulbOutlined, SearchOutlined,
  ThunderboltOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload';

import {
  ArtType, ArtStyle, GenerationMode,
  ART_TYPE_LABELS, ART_STYLE_LABELS,
  PROVIDER_LABELS, COMPLEXITY_LABELS,
} from '../types';
import type {
  TaskCreatePayload, AnalyzeResponse, GenerationProvider,
} from '../types';
import { useTaskStore } from '../stores/taskStore';
import { uploadApi, analyzeApi } from '../services/api';
import { mediaUrl, stripMediaAuthQuery } from '../utils/mediaUrl';
import { designTokens } from '../designTokens';
import { mainColumnMaxWidth } from '../utils/clientChrome';

const { antdToken: dt } = designTokens;

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

export default function TaskCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createTask, loading } = useTaskStore();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const referenceImages: string[] = [];
      for (const file of fileList) {
        const ru = file.response as { url?: string; canonicalUrl?: string } | undefined;
        const ref = ru?.canonicalUrl || (ru?.url ? stripMediaAuthQuery(ru.url) : '');
        if (ref) referenceImages.push(ref);
      }

      const payload: TaskCreatePayload = {
        title: values.title as string,
        description: values.description as string,
        art_type: (values.art_type as ArtType) || analysisResult?.analysis.art_type,
        art_style: (values.art_style as ArtStyle) || analysisResult?.analysis.art_style,
        generation_mode: (values.generation_mode as GenerationMode) || analysisResult?.analysis.recommended_mode,
        width: (values.width as number) || analysisResult?.analysis.recommended_size?.width,
        height: (values.height as number) || analysisResult?.analysis.recommended_size?.height,
        num_variations: (values.num_variations as number) || 4,
        reference_images: referenceImages,
        tags: tags.length > 0 ? tags : analysisResult?.analysis.tags,
        priority: (values.priority as number) || 0,
      };

      const task = await createTask(payload);
      message.success('任务已提交，AI正在分析中...');
      navigate(`/tasks/${task.id}`);
    } catch {
      message.error('提交失败：请检查网络与登录是否有效，或稍后再试');
    }
  };

  const handlePreviewAnalysis = async () => {
    try {
      const values = await form.validateFields(['title', 'description']);
      setAnalyzing(true);
      setAnalysisResult(null);

      const referenceImages: string[] = [];
      for (const file of fileList) {
        const ru = file.response as { url?: string; canonicalUrl?: string } | undefined;
        const ref = ru?.canonicalUrl || (ru?.url ? stripMediaAuthQuery(ru.url) : '');
        if (ref) referenceImages.push(ref);
      }

      const result = await analyzeApi.analyze({
        title: values.title as string,
        description: values.description as string,
        reference_images: referenceImages,
        tags,
        width: form.getFieldValue('width') as number | undefined,
        height: form.getFieldValue('height') as number | undefined,
      });

      setAnalysisResult(result);

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
      if (result.analysis.tags?.length > 0 && tags.length === 0) {
        setTags(result.analysis.tags);
      }

      message.success('AI分析完成！请查看下方结果');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error('分析失败，请检查输入后重试');
    } finally {
      setAnalyzing(false);
    }
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
      message.error('图片上传失败');
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  return (
    <PageContainer
      ghost
      style={{ maxWidth: mainColumnMaxWidth(), margin: '0 auto' }}
      title={
        <Space>
          <RocketOutlined />
          提交美术需求
        </Space>
      }
      subTitle="① 写标题和说明 → ②（建议）点「AI预览分析」看推荐 → ③ 需要再改下方选项 → ④ 提交生成"
    >
      <ProCard bordered style={{ borderRadius: dt.borderRadiusLG }} bodyStyle={{ padding: '32px 40px' }}>

        <Steps
          current={analysisResult ? 1 : 0}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '填写需求', icon: <BulbOutlined /> },
            { title: 'AI分析', icon: <SearchOutlined /> },
            { title: '提交生成', icon: <ThunderboltOutlined /> },
          ]}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ num_variations: 4, priority: 0 }}
          requiredMark="optional"
        >
          {/* Core requirement inputs */}
          <Form.Item
            name="title"
            label="需求标题"
            rules={[
              { required: true, whitespace: true, message: '请填标题，方便在任务列表里辨认' },
              { max: 120, message: '标题过长，建议不超过 120 字' },
            ]}
            extra="一句话说明「做什么」，例如角色立绘、场景概念图。"
          >
            <Input
              placeholder="例如：Q版角色设计 - 女战士"
              size="large"
              prefix={<BulbOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="需求描述"
            rules={[
              { required: true, whitespace: true, message: '请写清楚要画什么、什么风格、用在哪里（不能只空格）' },
              { max: 8000, message: '描述过长，可先精简或分多条需求提交' },
            ]}
            extra="尽量写具体：角色/场景、画风、颜色、姿势、背景、用途（如手游卡牌）。有参考图可一并上传。"
          >
            <TextArea
              rows={6}
              placeholder="例如：需要一个Q版女战士角色立绘，手持火焰长剑，穿着红色铠甲，动漫风格，白色背景，适用于手游卡牌。需要正面全身像，表情自信。"
            />
          </Form.Item>

          <Form.Item
            label="参考图片"
            extra="可不传。支持常见图片格式，最多 5 张；有助于对齐画风和构图。"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              customRequest={handleUpload as never}
              accept="image/*"
              multiple
            >
              {fileList.length < 5 && (
                <div>
                  <PictureOutlined style={{ fontSize: 24 }} />
                  <div style={{ marginTop: 8 }}>上传参考图</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          {/* AI Preview Analysis button */}
          <Form.Item extra="会检查标题和描述是否已填。分析完成后，下方会自动带出类型、风格、尺寸等推荐值，您仍可手动改。">
            <Button
              type="default"
              size="large"
              icon={<SearchOutlined />}
              onClick={handlePreviewAnalysis}
              loading={analyzing}
              block
              style={{
                borderColor: dt.colorPrimary,
                color: dt.colorPrimary,
                height: 48,
              }}
            >
              {analyzing ? '正在分析…' : 'AI 预览分析（推荐先做这一步）'}
            </Button>
          </Form.Item>

          {/* Analysis Results Card */}
          {analyzing && (
            <ProCard bordered style={{ marginBottom: 16, borderRadius: dt.borderRadius, textAlign: 'center' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                Claude AI正在分析你的需求...
              </Paragraph>
            </ProCard>
          )}

          {analysisResult && (
            <ProCard
              bordered
              style={{
                marginBottom: 16,
                borderRadius: dt.borderRadiusLG,
                border: '1px solid #91d5ff',
                background: '#f0f9ff',
              }}
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>AI分析结果</span>
                  <Tag color="blue">
                    置信度 {(analysisResult.analysis.confidence * 100).toFixed(0)}%
                  </Tag>
                </Space>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Descriptions column={1} size="small" title="需求分类">
                    <Descriptions.Item label="美术类型">
                      <Tag color="blue">
                        {ART_TYPE_LABELS[analysisResult.analysis.art_type] || analysisResult.analysis.art_type}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="美术风格">
                      <Tag color="purple">
                        {ART_STYLE_LABELS[analysisResult.analysis.art_style] || analysisResult.analysis.art_style}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="复杂度">
                      <Tag color={
                        analysisResult.analysis.complexity === 'high' ? 'red' :
                        analysisResult.analysis.complexity === 'medium' ? 'orange' : 'green'
                      }>
                        {COMPLEXITY_LABELS[analysisResult.analysis.complexity] || analysisResult.analysis.complexity}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="推荐尺寸">
                      {analysisResult.analysis.recommended_size?.width} x {analysisResult.analysis.recommended_size?.height}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Descriptions column={1} size="small" title="推荐生成策略">
                    <Descriptions.Item label="生成模式">
                      <Tag color="geekblue">
                        {analysisResult.routing.mode === 'api' ? '大模型API' : 'ComfyUI工作流'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="推荐服务">
                      <Tag color="cyan">
                        {PROVIDER_LABELS[analysisResult.routing.provider as GenerationProvider] || analysisResult.routing.provider}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="路由原因">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {analysisResult.routing.reason}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Descriptions column={1} size="small">
                <Descriptions.Item label="优化提示词">
                  <Paragraph
                    copyable
                    style={{ marginBottom: 0, fontSize: 12, fontFamily: 'monospace' }}
                  >
                    {analysisResult.analysis.optimized_prompt}
                  </Paragraph>
                </Descriptions.Item>
                {analysisResult.analysis.negative_prompt && (
                  <Descriptions.Item label="反向提示词">
                    <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      {analysisResult.analysis.negative_prompt}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {analysisResult.analysis.tags.length > 0 && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <Space wrap size={4}>
                    <Text strong style={{ fontSize: 12 }}>AI推荐标签: </Text>
                    {analysisResult.analysis.tags.map((tag) => (
                      <Tag key={tag} color="blue" style={{ fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </Space>
                </>
              )}

              <Divider style={{ margin: '12px 0' }} />
              <Paragraph style={{ fontSize: 12, marginBottom: 0 }}>
                <Text strong>分析理由: </Text>
                <Text type="secondary">{analysisResult.analysis.reasoning}</Text>
              </Paragraph>
            </ProCard>
          )}

          <Divider />

          {/* Optional overrides */}
          <Alert
            message="下面都是选填"
            description="不填则按上方 AI 分析结果（若已预览）或提交后由服务端自动推断。只有当您明确想改某一种设置时再动。"
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: dt.borderRadius }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="art_type"
                label="美术类型"
                extra="例如角色、场景、图标；不清楚可留空。"
              >
                <Select allowClear placeholder="留空则自动">
                  {Object.entries(ART_TYPE_LABELS).map(([val, label]) => (
                    <Select.Option key={val} value={val}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="art_style"
                label="美术风格"
                extra="如写实、二次元、像素等；可留空。"
              >
                <Select allowClear placeholder="留空则自动">
                  {Object.entries(ART_STYLE_LABELS).map(([val, label]) => (
                    <Select.Option key={val} value={val}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="generation_mode"
                label="生成模式"
                extra="一般不用改：API 适合快速出图，工作流适合固定管线。"
              >
                <Select allowClear placeholder="留空则自动">
                  <Select.Option value="api">大模型出图（API）</Select.Option>
                  <Select.Option value="comfyui">ComfyUI 工作流</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="width"
                label="宽度（像素）"
                extra="选填，256～4096；与高度成对填更稳妥；可先预览由系统推荐。"
              >
                <InputNumber
                  min={256} max={4096} step={64}
                  placeholder="如 1024" style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="height" label="高度（像素）">
                <InputNumber
                  min={256} max={4096} step={64}
                  placeholder="如 1024" style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="num_variations"
                label="一次出几张"
                extra="默认 4 张（1～8），越多耗时越久。"
              >
                <InputNumber min={1} max={8} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="priority"
                label="优先级"
                extra="0～10，数字越大越优先；一般用 0。"
              >
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="标签" extra="选填；可先跑预览，系统会推荐标签，您再删改。">
            <Space wrap>
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => setTags(tags.filter((t) => t !== tag))}
                  color="blue"
                >
                  {tag}
                </Tag>
              ))}
              <Input
                size="small"
                style={{ width: 120 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={addTag}
                placeholder="添加标签"
                suffix={<PlusOutlined onClick={addTag} style={{ cursor: 'pointer' }} />}
              />
            </Space>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap size="middle">
              <Button
                size="large"
                disabled={!analysisResult}
                onClick={() => {
                  setAnalysisResult(null);
                }}
              >
                上一步
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                icon={<RocketOutlined />}
                style={{ minWidth: 200, height: 48 }}
              >
                {analysisResult ? '提交' : '直接提交'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </ProCard>
    </PageContainer>
  );
}
