import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Typography, Tag, Badge, Descriptions, Space,
  Button, Image, Rate, Input, message, Spin, Divider, Alert,
  Tooltip, Card, Segmented, Timeline,
} from 'antd';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  ReloadOutlined, CheckCircleOutlined,
  ThunderboltOutlined, RobotOutlined, PictureOutlined,
  AppstoreOutlined, PicCenterOutlined, CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  TaskStatus, STATUS_LABELS, ART_TYPE_LABELS,
  ART_STYLE_LABELS, PROVIDER_LABELS,
} from '../types';
import type { GenerationResult } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { taskApi } from '../services/api';
import { mediaUrl } from '../utils/mediaUrl';
import { designTokens } from '../designTokens';
import { AaaflowEmpty } from '../components/AaaflowEmpty';

const { antdToken: dt } = designTokens;

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'default',
  [TaskStatus.ANALYZING]: 'processing',
  [TaskStatus.ROUTING]: 'processing',
  [TaskStatus.GENERATING]: 'processing',
  [TaskStatus.REVIEW]: 'warning',
  [TaskStatus.COMPLETED]: 'success',
  [TaskStatus.FAILED]: 'error',
  [TaskStatus.CANCELLED]: 'default',
};

const PROCESSING_STATUSES = [
  TaskStatus.ANALYZING,
  TaskStatus.ROUTING,
  TaskStatus.GENERATING,
];

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTask, loading, fetchTask, regenerateTask } = useTaskStore();
  const [feedback, setFeedback] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compare'>('grid');

  useEffect(() => {
    if (id) fetchTask(id);
  }, [id, fetchTask]);

  const pollingStatus =
    currentTask && PROCESSING_STATUSES.includes(currentTask.status)
      ? currentTask.status
      : null;

  useEffect(() => {
    if (!pollingStatus || !id) return;
    const interval = setInterval(() => {
      fetchTask(id);
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingStatus, id, fetchTask]);

  const handleRate = async (resultId: string, rating: number) => {
    if (!id) return;
    await taskApi.submitFeedback(id, resultId, { rating });
    message.success('评分已提交');
    fetchTask(id);
  };

  const handleSelect = async (resultId: string) => {
    if (!id) return;
    await taskApi.submitFeedback(id, resultId, { is_selected: true });
    message.success('已选定');
    fetchTask(id);
  };

  const handleRegenerate = async () => {
    if (!id) return;
    await regenerateTask(id, feedback || undefined);
    setFeedback('');
    message.info('重新生成中...');
  };

  if (loading && !currentTask) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentTask) {
    return <AaaflowEmpty description="任务不存在" />;
  }

  const task = currentTask;
  const isProcessing = PROCESSING_STATUSES.includes(task.status);

  return (
    <PageContainer
      ghost
      onBack={() => navigate('/tasks')}
      title={task.title}
      subTitle={
        <Badge
          status={STATUS_COLORS[task.status] as 'default' | 'processing' | 'success' | 'error' | 'warning'}
          text={STATUS_LABELS[task.status]}
        />
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => id && fetchTask(id)} loading={loading}>
          刷新
        </Button>
      }
      style={{ maxWidth: 1200, margin: '0 auto' }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ProCard bordered style={{ borderRadius: dt.borderRadiusLG, marginBottom: 16 }}>
            <Paragraph style={{ marginTop: 0 }}>{task.description}</Paragraph>

            {task.tags.length > 0 && (
              <Space wrap>
                {task.tags.map((tag) => (
                  <Tag key={tag} color="blue">{tag}</Tag>
                ))}
              </Space>
            )}
          </ProCard>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert
              type="info"
              showIcon
              icon={<ThunderboltOutlined />}
              message={`AI正在${STATUS_LABELS[task.status]}...`}
              description="请耐心等待，页面会自动刷新。"
              style={{ marginBottom: 16, borderRadius: dt.borderRadiusLG }}
            />
          )}

          {task.status === TaskStatus.FAILED && (
            <Alert
              type="error"
              showIcon
              message="生成失败"
              description={
                <Space direction="vertical" size="small">
                  <span>
                    可尝试在下方填写修改意见后点击「重新生成」；若多次失败，请联系管理员查看服务端日志与模型配置。
                  </span>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => id && fetchTask(id)}>
                    刷新任务状态
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: dt.borderRadiusLG }}
            />
          )}

          <ProCard
            bordered
            title={
              <Space>
                <PictureOutlined />
                生成结果 ({task.results.length})
              </Space>
            }
            style={{ borderRadius: dt.borderRadiusLG }}
          >
            {task.results.length === 0 ? (
              <AaaflowEmpty description={isProcessing ? '生成中...' : '暂无结果'} />
            ) : (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Segmented
                    value={viewMode}
                    onChange={(v) => setViewMode(v as 'grid' | 'compare')}
                    options={[
                      { label: '网格视图', value: 'grid', icon: <AppstoreOutlined /> },
                      { label: '对比视图', value: 'compare', icon: <PicCenterOutlined /> },
                    ]}
                  />
                </Space>
                <Row gutter={[16, 16]}>
                  {task.results.map((result: GenerationResult) => (
                  <Col
                    {...(viewMode === 'grid'
                      ? { xs: 24, md: 12 }
                      : { span: Math.max(6, Math.floor(24 / task.results.length)) })}
                    key={result.id}
                  >
                    <Card
                      hoverable
                      style={{
                        borderRadius: dt.borderRadius,
                        border: result.is_selected ? `2px solid ${dt.colorPrimary}` : undefined,
                      }}
                      cover={
                        <Image
                          src={mediaUrl(result.image_url)}
                          alt="Generated"
                          style={{ borderRadius: `${dt.borderRadius}px ${dt.borderRadius}px 0 0`, maxHeight: 400, objectFit: 'cover' }}
                          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E"
                        />
                      }
                      actions={[
                        <Rate
                          key="rate"
                          value={result.rating || 0}
                          onChange={(v) => handleRate(result.id, v)}
                          style={{ fontSize: 14 }}
                        />,
                        <Tooltip key="select" title="选定此结果">
                          <Button
                            type={result.is_selected ? 'primary' : 'default'}
                            icon={<CheckCircleOutlined />}
                            size="small"
                            onClick={() => handleSelect(result.id)}
                          >
                            {result.is_selected ? '已选定' : '选定'}
                          </Button>
                        </Tooltip>,
                        <Tooltip key="reuse" title="以此图为参考重新生成">
                          <Button
                            icon={<CopyOutlined />}
                            size="small"
                            onClick={() => {
                              setFeedback(`请基于这张图(${result.image_url})进行优化和精修`);
                              message.info('已填入参考，可修改后点击重新生成');
                            }}
                          >
                            以此重新生成
                          </Button>
                        </Tooltip>,
                      ]}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Tag color="cyan">
                          {PROVIDER_LABELS[result.provider] || result.provider}
                        </Tag>
                        {result.generation_time_seconds && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            生成耗时: {result.generation_time_seconds.toFixed(1)}s
                          </Text>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
                </Row>
              </>
            )}

            {task.results.length > 0 && (
              <>
                <Divider orientation="left">生成历史</Divider>
                <Timeline
                  items={task.results.map((r, i) => ({
                    color: r.is_selected ? 'green' : 'blue',
                    children: (
                      <Space>
                        <Text>第 {i + 1} 张</Text>
                        <Tag color="cyan">{PROVIDER_LABELS[r.provider] || r.provider}</Tag>
                        {r.generation_time_seconds && (
                          <Text type="secondary">{r.generation_time_seconds.toFixed(1)}s</Text>
                        )}
                        {r.rating && <Rate disabled value={r.rating} style={{ fontSize: 12 }} />}
                        {r.is_selected && <Tag color="green">已选定</Tag>}
                      </Space>
                    ),
                  }))}
                />
              </>
            )}

            {task.status === TaskStatus.REVIEW && (
              <>
                <Divider />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <TextArea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="输入修改意见，AI将根据反馈重新生成（可选）"
                  />
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={handleRegenerate}
                    loading={loading}
                  >
                    重新生成
                  </Button>
                </Space>
              </>
            )}
          </ProCard>
        </Col>

        <Col xs={24} lg={8}>
          <ProCard
            bordered
            title={
              <Space>
                <RobotOutlined />
                AI 分析
              </Space>
            }
            style={{ borderRadius: dt.borderRadiusLG, marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="类型">
                {task.art_type
                  ? ART_TYPE_LABELS[task.art_type as keyof typeof ART_TYPE_LABELS]
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="风格">
                {task.art_style
                  ? ART_STYLE_LABELS[task.art_style as keyof typeof ART_STYLE_LABELS]
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生成模式">
                {task.generation_mode === 'api' ? '大模型API' : task.generation_mode === 'comfyui' ? 'ComfyUI' : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生成服务">
                {task.generation_provider
                  ? PROVIDER_LABELS[task.generation_provider as keyof typeof PROVIDER_LABELS]
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="尺寸">
                {task.width && task.height ? `${task.width} x ${task.height}` : '-'}
              </Descriptions.Item>
            </Descriptions>

            {task.ai_analysis && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                {task.ai_analysis.complexity && (
                  <Paragraph>
                    <Text strong>复杂度: </Text>
                    <Tag color={
                      task.ai_analysis.complexity === 'high' ? 'red' :
                      task.ai_analysis.complexity === 'medium' ? 'orange' : 'green'
                    }>
                      {task.ai_analysis.complexity as string}
                    </Tag>
                  </Paragraph>
                )}
                {task.ai_analysis.confidence && (
                  <Paragraph>
                    <Text strong>置信度: </Text>
                    {((task.ai_analysis.confidence as number) * 100).toFixed(0)}%
                  </Paragraph>
                )}
                {task.ai_analysis.reasoning && (
                  <Paragraph>
                    <Text strong>分析理由: </Text>
                    <br />
                    <Text type="secondary">{task.ai_analysis.reasoning as string}</Text>
                  </Paragraph>
                )}
              </>
            )}
          </ProCard>

          {task.optimized_prompt && (
            <ProCard bordered title="优化后提示词" size="small" style={{ borderRadius: dt.borderRadiusLG, marginBottom: 16 }}>
              <Paragraph
                copyable
                style={{ marginBottom: 0, fontSize: 12, lineHeight: 1.6 }}
              >
                {task.optimized_prompt}
              </Paragraph>
              {task.negative_prompt && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <Text strong>Negative: </Text>
                    {task.negative_prompt}
                  </Text>
                </>
              )}
            </ProCard>
          )}

          <ProCard bordered title="任务信息" size="small" style={{ borderRadius: dt.borderRadiusLG }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="创建时间">
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                {task.priority}
              </Descriptions.Item>
              <Descriptions.Item label="生成数量">
                {task.num_variations}
              </Descriptions.Item>
            </Descriptions>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
