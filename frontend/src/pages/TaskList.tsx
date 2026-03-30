import { useEffect, useRef, useState } from 'react';
import type { Key } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Space, Button, Select, Badge, Tooltip, Popconfirm, Modal, message } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined, EyeOutlined, DeleteOutlined,
  ReloadOutlined, ClockCircleOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import type { ArtTask } from '../types';
import {
  TaskStatus, ART_TYPE_LABELS, ART_STYLE_LABELS,
  STATUS_LABELS, PROVIDER_LABELS,
} from '../types';
import { useTaskStore } from '../stores/taskStore';
import { ListPageLoadErrorAlert, ListPageTableSkeleton } from '../components/listPageShared';

const KEY_TASKLIST_STATUS = 'aaaflow.tasklist.status';
const KEY_TASKLIST_PAGE = 'aaaflow.tasklist.page';

function readStoredStatus(): TaskStatus | undefined {
  try {
    const s = sessionStorage.getItem(KEY_TASKLIST_STATUS);
    if (!s) return undefined;
    if (Object.values(TaskStatus).includes(s as TaskStatus)) return s as TaskStatus;
  } catch {
    /* ignore */
  }
  return undefined;
}

function readStoredPage(): number {
  try {
    const p = parseInt(sessionStorage.getItem(KEY_TASKLIST_PAGE) || '1', 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  } catch {
    return 1;
  }
}

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

export default function TaskList() {
  const navigate = useNavigate();
  const {
    tasks, total, page, pageSize, loading, error, fetchTasks, deleteTask, clearError,
  } = useTaskStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(() => readStoredStatus());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const prevStatusRef = useRef<TaskStatus | undefined | null>(null);

  useEffect(() => {
    let nextPage: number;
    if (prevStatusRef.current === null) {
      nextPage = readStoredPage();
      prevStatusRef.current = statusFilter;
    } else if (prevStatusRef.current !== statusFilter) {
      nextPage = 1;
      prevStatusRef.current = statusFilter;
      try {
        sessionStorage.setItem(KEY_TASKLIST_PAGE, '1');
      } catch {
        /* ignore */
      }
    } else {
      nextPage = readStoredPage();
    }

    try {
      if (statusFilter) sessionStorage.setItem(KEY_TASKLIST_STATUS, statusFilter);
      else sessionStorage.removeItem(KEY_TASKLIST_STATUS);
    } catch {
      /* ignore */
    }

    void fetchTasks(nextPage, statusFilter);
  }, [statusFilter, fetchTasks]);

  const columns: ProColumns<ArtTask>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (_, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>{record.title}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'art_type',
      key: 'art_type',
      width: 100,
      render: (_, record) =>
        record.art_type ? (
          <Tag>{ART_TYPE_LABELS[record.art_type as keyof typeof ART_TYPE_LABELS] || record.art_type}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '风格',
      dataIndex: 'art_style',
      key: 'art_style',
      width: 100,
      render: (_, record) =>
        record.art_style ? (
          <Tag color="purple">
            {ART_STYLE_LABELS[record.art_style as keyof typeof ART_STYLE_LABELS] || record.art_style}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge
          status={STATUS_COLORS[record.status] as 'default' | 'processing' | 'success' | 'error' | 'warning'}
          text={STATUS_LABELS[record.status]}
        />
      ),
    },
    {
      title: '生成服务',
      dataIndex: 'generation_provider',
      key: 'generation_provider',
      width: 130,
      render: (_, record) =>
        record.generation_provider ? (
          <Tag color="cyan">
            {PROVIDER_LABELS[record.generation_provider as keyof typeof PROVIDER_LABELS] ||
              record.generation_provider}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '结果数',
      key: 'results_count',
      width: 80,
      render: (_, record) => record.results?.length || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (_, record) => (
        <Tooltip title={dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}>
          <Space size={4}>
            <ClockCircleOutlined />
            {dayjs(record.created_at).format('MM-DD HH:mm')}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除？"
            onConfirm={() => deleteTask(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      ghost
      breadcrumbRender={false}
      title={
        <Space>
          <UnorderedListOutlined />
          任务列表
        </Space>
      }
      subTitle="筛选、刷新与查看美术生成任务"
    >
      {error ? (
        <ListPageLoadErrorAlert
          message="加载失败"
          description={error}
          onRetry={() => void fetchTasks(page, statusFilter)}
          onDismiss={clearError}
        />
      ) : null}
      {loading && tasks.length === 0 ? (
        <ListPageTableSkeleton />
      ) : (
        <ProTable<ArtTask>
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          loading={loading && tasks.length > 0}
          search={false}
          options={{
            reload: () => void fetchTasks(page, statusFilter),
            density: true,
            setting: true,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => {
              try {
                sessionStorage.setItem(KEY_TASKLIST_PAGE, String(p));
              } catch {
                /* ignore */
              }
              void fetchTasks(p, statusFilter);
            },
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: false,
          }}
          cardBordered
          headerTitle={false}
          toolBarRender={() => [
            <Select
              key="status"
              allowClear
              placeholder="请选择状态"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <Select.Option key={val} value={val}>
                  {label}
                </Select.Option>
              ))}
            </Select>,
            <Button key="reload" icon={<ReloadOutlined />} onClick={() => void fetchTasks(page, statusFilter)}>
              刷新
            </Button>,
            <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
              新建任务
            </Button>,
            <Button
              key="batchDel"
              danger
              disabled={!selectedRowKeys.length}
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '批量删除',
                  content: `将删除 ${selectedRowKeys.length} 条任务，不可恢复。请先勾选表格左侧复选框。`,
                  okText: '删除',
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    const ids = [...selectedRowKeys];
                    for (const id of ids) {
                      await deleteTask(String(id));
                    }
                    setSelectedRowKeys([]);
                    void fetchTasks(page, statusFilter);
                    message.success('已删除所选任务');
                  },
                });
              }}
            >
              批量删除
            </Button>,
          ]}
        />
      )}
    </PageContainer>
  );
}
