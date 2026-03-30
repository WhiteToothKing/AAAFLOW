import {
  useEffect, useState, useRef,
  type CSSProperties, type MouseEvent, type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Tag, Skeleton, Alert,
} from 'antd';
import {
  PlusOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  DeploymentUnitOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  RightOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { TaskStatus, STATUS_LABELS } from '../types';
import type { ArtTask } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { AaaflowEmpty } from '../components/AaaflowEmpty';
import { brandColors, gradients, shadows, transitions } from '../designTokens';
import { useAuth } from '../hooks/useAuth';
import { systemApi, type SystemStatsResponse } from '../services/api';

/* ------------------------------------------------------------------ */
/*  CSS keyframes + responsive grid injected once                      */
/* ------------------------------------------------------------------ */
const dashboardStyles = `
@keyframes aaaflow-fadeIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.aaaflow-dash {
  animation: aaaflow-fadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 40px;
}
.aaaflow-dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.aaaflow-dash-bottom {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1100px) {
  .aaaflow-dash-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .aaaflow-dash { padding: 16px; }
  .aaaflow-dash-stats { grid-template-columns: 1fr; }
  .aaaflow-dash-bottom { grid-template-columns: 1fr; }
}
`;

/* ------------------------------------------------------------------ */
/*  Reusable style constants                                           */
/* ------------------------------------------------------------------ */
const CARD_RADIUS = 12;

const statCardBase: CSSProperties = {
  borderRadius: CARD_RADIUS + 2,
  padding: '22px 24px',
  color: '#fff',
  boxShadow: shadows.card,
  transition: transitions.spring,
  minHeight: 118,
  cursor: 'default',
  position: 'relative',
  overflow: 'hidden',
};

const statValueStyle: CSSProperties = {
  fontSize: 38,
  fontWeight: 700,
  lineHeight: 1.1,
  color: '#fff',
  letterSpacing: '-0.02em',
};

const statLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.88)',
  marginBottom: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const sectionCardStyle: CSSProperties = {
  borderRadius: CARD_RADIUS,
  border: `1px solid ${brandColors.gray200}`,
  background: '#fff',
  boxShadow: shadows.card,
  overflow: 'hidden',
};

const primaryGradientBtn: CSSProperties = {
  background: gradients.primaryBtn,
  border: 'none',
  color: '#fff',
  fontWeight: 600,
  boxShadow: shadows.sm,
  height: 44,
  paddingLeft: 24,
  paddingRight: 24,
  borderRadius: 10,
  cursor: 'pointer',
  transition: transitions.normal,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function statCardHover(e: MouseEvent<HTMLElement>, up: boolean) {
  const el = e.currentTarget;
  el.style.transform = up ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)';
  el.style.boxShadow = up ? shadows.lg : shadows.card;
}

function statusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.COMPLETED: return brandColors.success;
    case TaskStatus.FAILED: return brandColors.error;
    case TaskStatus.GENERATING:
    case TaskStatus.ANALYZING:
    case TaskStatus.ROUTING: return brandColors.primary;
    case TaskStatus.REVIEW: return brandColors.warning;
    case TaskStatus.CANCELLED: return brandColors.gray400;
    default: return brandColors.gray300;
  }
}

function clientTaskStats(tasks: ArtTask[]) {
  return {
    total: tasks.length,
    generating: tasks.filter((t) =>
      [TaskStatus.ANALYZING, TaskStatus.ROUTING, TaskStatus.GENERATING].includes(t.status),
    ).length,
    completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    failed: tasks.filter((t) => t.status === TaskStatus.FAILED).length,
  };
}

/* ------------------------------------------------------------------ */
/*  TrendHint                                                          */
/* ------------------------------------------------------------------ */
function TrendHint({
  diff,
  noCompareText = '首次同步',
  style,
}: {
  diff: number | null;
  noCompareText?: string;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 8,
    ...style,
  };
  if (diff === null) return <span style={base}><MinusOutlined style={{ fontSize: 10 }} />{noCompareText}</span>;
  if (diff === 0) return <span style={base}><MinusOutlined style={{ fontSize: 10 }} />较上次持平</span>;
  if (diff > 0) return <span style={base}><RiseOutlined style={{ fontSize: 10 }} />较上次 +{diff}</span>;
  return <span style={base}><FallOutlined style={{ fontSize: 10 }} />较上次 {diff}</span>;
}

/* ------------------------------------------------------------------ */
/*  Quick-entry data                                                   */
/* ------------------------------------------------------------------ */
const quickEntries: Array<{
  icon: ReactNode;
  title: string;
  description: string;
  path: string;
  color: string;
}> = [
  { icon: <PlusOutlined />, title: '提交需求', description: '创建新的美术生成任务并上传参考', path: '/create', color: brandColors.primary },
  { icon: <MessageOutlined />, title: 'AI对话', description: '与模型对话，快速迭代创意与提示词', path: '/chat', color: brandColors.accent },
  { icon: <ThunderboltOutlined />, title: '需求向导', description: '分步引导梳理需求与风格参数', path: '/wizard', color: brandColors.success },
  { icon: <DeploymentUnitOutlined />, title: '工作流管理', description: '维护 ComfyUI 工作流与路由配置', path: '/workflows', color: brandColors.warning },
];

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, total, loading, error, fetchTasks, clearError } = useTaskStore();
  const [systemStats, setSystemStats] = useState<SystemStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsFetchError, setStatsFetchError] = useState<string | null>(null);
  const prevStatsRef = useRef<SystemStatsResponse | null>(null);

  useEffect(() => { void fetchTasks(1); }, [fetchTasks]);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsFetchError(null);
    void systemApi
      .stats()
      .then((data) => {
        if (cancelled) return;
        setSystemStats((prev) => { prevStatsRef.current = prev; return data; });
      })
      .catch(() => { if (!cancelled) setStatsFetchError('指标接口暂不可用，已用当前列表估算'); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const refreshAll = () => {
    void fetchTasks(1);
    setStatsLoading(true);
    setStatsFetchError(null);
    void systemApi
      .stats()
      .then((data) => { setSystemStats((prev) => { prevStatsRef.current = prev; return data; }); })
      .catch(() => setStatsFetchError('指标接口暂不可用，已用当前列表估算'))
      .finally(() => setStatsLoading(false));
  };

  const client = clientTaskStats(tasks);
  const displayTotal = systemStats?.tasks.total ?? total ?? client.total;
  const displayGenerating = systemStats?.tasks.generating ?? client.generating;
  const displayCompleted = systemStats?.tasks.completed ?? client.completed;
  const displayFailed = systemStats?.tasks.failed ?? client.failed;

  const prev = prevStatsRef.current;
  const trendTotal = prev && systemStats ? systemStats.tasks.total - prev.tasks.total : null;
  const trendGen = prev && systemStats ? systemStats.tasks.generating - prev.tasks.generating : null;
  const trendDone = prev && systemStats ? systemStats.tasks.completed - prev.tasks.completed : null;
  const trendFail = prev && systemStats ? systemStats.tasks.failed - prev.tasks.failed : null;

  const displayName = user?.full_name?.trim() || user?.username?.trim() || '用户';
  const startOfToday = dayjs().startOf('day');
  const todayNewCount = tasks.filter((t) => dayjs(t.created_at).isSame(startOfToday, 'day')).length;

  const summaryText = loading && tasks.length === 0
    ? '正在同步任务数据…'
    : `今日新建 ${todayNewCount} 个任务 · 全库 ${displayTotal} 个任务，${displayGenerating} 个生成中，${displayCompleted} 个已完成`;

  const statLoading = statsLoading && !systemStats && !statsFetchError;
  const trendNoCompare = statsFetchError && !systemStats ? '列表估算' : '首次同步';

  const statCards: Array<{
    label: string;
    value: number | string;
    gradient: string;
    icon: ReactNode;
    trend: number | null;
  }> = [
    { label: '总任务', value: statLoading ? '—' : displayTotal, gradient: gradients.statCard1, icon: <BarChartOutlined />, trend: systemStats ? trendTotal : null },
    { label: '生成中', value: statLoading ? '—' : displayGenerating, gradient: gradients.statCard2, icon: <ThunderboltOutlined />, trend: systemStats ? trendGen : null },
    { label: '已完成', value: statLoading ? '—' : displayCompleted, gradient: gradients.statCard3, icon: <CheckCircleOutlined />, trend: systemStats ? trendDone : null },
    { label: '失败', value: statLoading ? '—' : displayFailed, gradient: gradients.statCard4, icon: <CloseCircleOutlined />, trend: systemStats ? trendFail : null },
  ];

  const recentTasks = tasks.slice(0, 7);

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="aaaflow-dash">
        {/* Alerts */}
        {error && (
          <Alert
            type="error" showIcon
            message="工作台数据加载失败" description={error}
            action={<Button size="small" type="primary" onClick={() => void fetchTasks(1)}>重试</Button>}
            closable onClose={clearError}
            style={{ marginBottom: 16, borderRadius: CARD_RADIUS }}
          />
        )}
        {statsFetchError && (
          <Alert
            type="info" showIcon message={statsFetchError}
            closable onClose={() => setStatsFetchError(null)}
            style={{ marginBottom: 16, borderRadius: CARD_RADIUS }}
          />
        )}

        {/* ── Hero welcome card ── */}
        <div
          style={{
            background: gradients.heroCard,
            borderRadius: CARD_RADIUS + 4,
            padding: '32px 36px 28px',
            marginBottom: 24,
            boxShadow: shadows.sm,
            border: `1px solid ${brandColors.gray100}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <Typography.Title
              level={3}
              style={{ margin: 0, fontSize: 26, fontWeight: 700, color: brandColors.gray900 }}
            >
              👋 你好，{displayName}
            </Typography.Title>
            <Typography.Paragraph
              style={{
                marginTop: 10, marginBottom: 24,
                fontSize: 15, color: brandColors.gray600,
                maxWidth: 640, lineHeight: 1.7,
              }}
            >
              {summaryText}
            </Typography.Paragraph>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/create')}
                style={primaryGradientBtn}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadows.md; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = shadows.sm; }}
              >
                <PlusOutlined /> 新建任务
              </button>
              <button
                type="button"
                onClick={() => navigate('/wizard')}
                style={{ ...primaryGradientBtn, background: 'rgba(255,255,255,0.85)', color: brandColors.gray900, border: `1px solid ${brandColors.gray200}` }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadows.md; e.currentTarget.style.background = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = shadows.sm; e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; }}
              >
                <ThunderboltOutlined /> 启动向导
              </button>
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshAll}
            loading={loading && tasks.length === 0}
            style={{ borderRadius: 10 }}
          >
            刷新
          </Button>
        </div>

        {/* ── Stat cards ── */}
        <div className="aaaflow-dash-stats">
          {statCards.map((card) => (
            <div
              key={card.label}
              style={{ ...statCardBase, background: card.gradient }}
              onMouseEnter={(e) => statCardHover(e, true)}
              onMouseLeave={(e) => statCardHover(e, false)}
            >
              {/* decorative circle */}
              <div style={{
                position: 'absolute', top: -18, right: -18,
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.10)',
              }} />
              <div style={statLabelStyle}>{card.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 22, opacity: 0.88 }}>{card.icon}</span>
                <span style={statValueStyle}>{card.value}</span>
              </div>
              <TrendHint diff={card.trend} noCompareText={trendNoCompare} />
            </div>
          ))}
        </div>

        {/* ── Bottom two-column section ── */}
        <div className="aaaflow-dash-bottom">
          {/* Left: Recent tasks */}
          <div style={sectionCardStyle}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px 14px',
              borderBottom: `1px solid ${brandColors.gray100}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClockCircleOutlined style={{ color: brandColors.primary, fontSize: 16 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: brandColors.gray900 }}>最近任务</span>
              </div>
              <Button type="link" size="small" onClick={() => navigate('/tasks')} style={{ fontSize: 13 }}>
                查看全部 <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {loading && tasks.length === 0 ? (
                <div style={{ padding: '16px 24px' }}><Skeleton active paragraph={{ rows: 5 }} /></div>
              ) : error && tasks.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <AaaflowEmpty description="任务列表未加载成功，请点击上方「重试」" />
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <AaaflowEmpty description="暂无任务">
                    <button type="button" onClick={() => navigate('/create')} style={{ ...primaryGradientBtn, marginTop: 8, fontSize: 14, height: 38, paddingLeft: 18, paddingRight: 18 }}>
                      <PlusOutlined /> 创建第一个任务
                    </button>
                  </AaaflowEmpty>
                </div>
              ) : (
                recentTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: transitions.fast,
                      borderBottom: idx < recentTasks.length - 1 ? `1px solid ${brandColors.gray50}` : 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = brandColors.gray50; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Status dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: statusColor(task.status),
                    }} />
                    {/* Title */}
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 14, fontWeight: 500, color: brandColors.gray900,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </span>
                    {/* Type tag if available */}
                    {task.art_type && (
                      <Tag style={{
                        margin: 0, border: 'none', borderRadius: 6,
                        background: brandColors.primaryBg, color: brandColors.primary,
                        fontSize: 12, fontWeight: 500, lineHeight: '22px',
                      }}>
                        {task.art_type}
                      </Tag>
                    )}
                    {/* Status badge */}
                    <Tag style={{
                      margin: 0, border: 'none', borderRadius: 6,
                      background: statusColor(task.status),
                      color: task.status === TaskStatus.PENDING ? brandColors.gray700 : '#fff',
                      fontSize: 12, fontWeight: 500, lineHeight: '22px',
                    }}>
                      {STATUS_LABELS[task.status]}
                    </Tag>
                    {/* Time */}
                    <span style={{ fontSize: 12, color: brandColors.gray400, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {dayjs(task.created_at).format('MM-DD HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Quick entry */}
          <div style={sectionCardStyle}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '18px 24px 14px',
              borderBottom: `1px solid ${brandColors.gray100}`,
            }}>
              <AppstoreOutlined style={{ color: brandColors.accent, fontSize: 16 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: brandColors.gray900 }}>快捷入口</span>
            </div>
            <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quickEntries.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 14,
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: CARD_RADIUS,
                    border: `1px solid ${brandColors.gray200}`,
                    background: brandColors.gray50,
                    cursor: 'pointer',
                    transition: transitions.normal,
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = brandColors.primaryLight;
                    e.currentTarget.style.boxShadow = shadows.cardHover;
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = brandColors.gray200;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = brandColors.gray50;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: item.color, flexShrink: 0,
                    background: `${item.color}12`,
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: brandColors.gray900, marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: brandColors.gray500, lineHeight: 1.5 }}>
                      {item.description}
                    </div>
                  </span>
                  <RightOutlined style={{ fontSize: 11, color: brandColors.gray300 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
