import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Typography, Space, Button, List, Tag, Badge, theme, Skeleton, Alert,
} from 'antd';
import {
  PlusOutlined, ThunderboltOutlined, PictureOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  RocketOutlined, BarChartOutlined, MessageOutlined, ReloadOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import dayjs from 'dayjs';

import { TaskStatus, STATUS_LABELS, ART_TYPE_LABELS } from '../types';
import type { ArtTask } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { AaaflowEmpty } from '../components/AaaflowEmpty';

const { Paragraph } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { tasks, total, loading, error, fetchTasks, clearError } = useTaskStore();

  useEffect(() => {
    void fetchTasks(1);
  }, [fetchTasks]);

  const stats = {
    total,
    processing: tasks.filter((t) =>
      [TaskStatus.ANALYZING, TaskStatus.ROUTING, TaskStatus.GENERATING].includes(t.status)
    ).length,
    review: tasks.filter((t) => t.status === TaskStatus.REVIEW).length,
    completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
  };

  const cardRadius = { borderRadius: token.borderRadius };

  return (
    <PageContainer
      ghost
      breadcrumbRender={false}
      title={
        <Space size={10}>
          <RocketOutlined style={{ color: token.colorPrimary }} />
          <span>游戏美术 AI 工作台</span>
        </Space>
      }
      subTitle={
        <span style={{ color: token.colorTextSecondary }}>
          智能分析需求，自动路由生成，高效产出美术资源
        </span>
      }
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void fetchTasks(1)} loading={loading}>
            刷新
          </Button>
          <Button size="large" icon={<ScheduleOutlined />} onClick={() => navigate('/wizard')}>
            需求向导
          </Button>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
            新建任务
          </Button>
        </Space>
      }
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message="工作台数据加载失败"
          description={error}
          action={
            <Button size="small" type="primary" onClick={() => void fetchTasks(1)}>
              重试
            </Button>
          }
          closable
          onClose={clearError}
          style={{ marginBottom: token.marginMD }}
        />
      ) : null}
      <Row gutter={[16, 16]} style={{ marginBottom: token.marginMD }}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            bordered
            style={cardRadius}
            statistic={{
              title: '总任务数',
              value: loading ? '—' : stats.total,
              icon: <BarChartOutlined style={{ color: token.colorPrimary }} />,
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            bordered
            style={cardRadius}
            statistic={{
              title: '处理中',
              value: loading ? '—' : stats.processing,
              icon: <ThunderboltOutlined style={{ color: token.colorPrimary }} />,
              valueStyle: { color: token.colorPrimary },
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            bordered
            style={cardRadius}
            statistic={{
              title: '待审核',
              value: loading ? '—' : stats.review,
              icon: <ClockCircleOutlined style={{ color: token.colorWarning }} />,
              valueStyle: { color: token.colorWarning },
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            bordered
            style={cardRadius}
            statistic={{
              title: '已完成',
              value: loading ? '—' : stats.completed,
              icon: <CheckCircleOutlined style={{ color: token.colorSuccess }} />,
              valueStyle: { color: token.colorSuccess },
            }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <ProCard
            title={
              <Space>
                <PictureOutlined style={{ color: token.colorTextSecondary }} />
                最近任务
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/tasks')}>
                查看全部
              </Button>
            }
            bordered
            style={cardRadius}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : error && tasks.length === 0 ? (
              <AaaflowEmpty description="任务列表未加载成功，请点击上方「重试」" />
            ) : tasks.length === 0 ? (
              <AaaflowEmpty description="暂无任务">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/create')}
                >
                  创建第一个任务
                </Button>
              </AaaflowEmpty>
            ) : (
              <List
                dataSource={tasks.slice(0, 8)}
                renderItem={(task: ArtTask) => (
                  <List.Item
                    key={task.id}
                    style={{
                      cursor: 'pointer',
                      borderRadius: token.borderRadiusSM,
                      paddingLeft: token.paddingSM,
                      paddingRight: token.paddingSM,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = token.colorFillAlter;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    extra={
                      <Space>
                        {task.art_type && (
                          <Tag>{ART_TYPE_LABELS[task.art_type as keyof typeof ART_TYPE_LABELS]}</Tag>
                        )}
                        <Badge
                          status={
                            task.status === TaskStatus.COMPLETED ? 'success' :
                            task.status === TaskStatus.FAILED ? 'error' :
                            task.status === TaskStatus.REVIEW ? 'warning' :
                            [TaskStatus.ANALYZING, TaskStatus.ROUTING, TaskStatus.GENERATING].includes(task.status) ? 'processing' :
                            'default'
                          }
                          text={STATUS_LABELS[task.status]}
                        />
                      </Space>
                    }
                  >
                    <List.Item.Meta
                      title={task.title}
                      description={
                        <Space size={16}>
                          <span>{dayjs(task.created_at).format('MM-DD HH:mm')}</span>
                          <span>{task.results.length} 个结果</span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </ProCard>
        </Col>

        <Col xs={24} xl={10}>
          <ProCard
            title="快速操作"
            bordered
            style={{ ...cardRadius, marginBottom: token.marginMD }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                block
                size="large"
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => navigate('/chat')}
              >
                AI对话工作台
              </Button>
              <Button
                block
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate('/create')}
              >
                提交新需求
              </Button>
              <Button
                block
                size="large"
                icon={<PictureOutlined />}
                onClick={() => navigate('/tasks')}
              >
                查看所有任务
              </Button>
              <Button
                block
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={() => navigate('/workflows')}
              >
                管理工作流
              </Button>
            </Space>
          </ProCard>

          <ProCard title="系统说明" bordered size="small" style={cardRadius}>
            <Paragraph style={{ fontSize: token.fontSize, marginBottom: token.marginXS }}>
              <strong>工作流程:</strong>
            </Paragraph>
            <ol
              style={{
                paddingLeft: token.marginLG + 4,
                fontSize: token.fontSize,
                color: token.colorTextSecondary,
                lineHeight: token.lineHeight,
              }}
            >
              <li>提交美术需求描述和参考图</li>
              <li>Claude AI分析需求类型和风格</li>
              <li>智能路由到最佳生成服务</li>
              <li>自动生成多个方案供选择</li>
              <li>支持反馈迭代，持续优化</li>
            </ol>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
