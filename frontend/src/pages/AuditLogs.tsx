import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Space, Tag, Typography, message } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  DownloadOutlined, ReloadOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import type { AuditLogItem } from '../types';
import { auditApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AaaflowEmpty } from '../components/AaaflowEmpty';
import { ListPageLoadErrorAlert, ListPageTableSkeleton } from '../components/listPageShared';

const { Text } = Typography;

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const { loading: userLoading, isAdmin } = useAuth();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const data = await auditApi.list({ limit: PAGE_SIZE, offset });
      setItems(data.items);
      setTotal(data.total);
      setPage(p);
    } catch {
      const msg = '加载失败，请确认已使用管理员账号登录';
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && isAdmin) {
      void fetchPage(1);
    }
  }, [userLoading, isAdmin, fetchPage]);

  const handleExport = async () => {
    try {
      const blob = await auditApi.exportCsvBlob(5000);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aaaflow_audit_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('已开始下载 CSV（UTF-8 BOM，可用 Excel 打开）');
    } catch {
      message.error('导出失败');
    }
  };

  if (userLoading) {
    return (
      <PageContainer ghost breadcrumbRender={false} title="审计日志">
        <ListPageTableSkeleton rows={6} />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer ghost breadcrumbRender={false} title="审计日志">
        <Alert
          type="warning"
          showIcon
          message="需要管理员权限"
          description="审计日志仅对本组织管理员开放。若需查看请联系管理员分配 admin 角色。"
        />
      </PageContainer>
    );
  }

  const columns: ProColumns<AuditLogItem>[] = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (_, r) => dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (_, r) => <Tag color="blue">{r.action}</Tag>,
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 120,
    },
    {
      title: '资源 ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      width: 280,
      ellipsis: true,
      render: (_, r) => r.resource_id || '—',
    },
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 280,
      ellipsis: true,
      render: (_, r) => r.user_id || '—',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (_, r) =>
        r.detail ? (
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {JSON.stringify(r.detail)}
          </Text>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <PageContainer
      ghost
      breadcrumbRender={false}
      title={
        <Space>
          <FileSearchOutlined />
          审计日志
        </Space>
      }
      subTitle={`本组织共 ${total} 条记录，按时间倒序`}
    >
      {loadError ? (
        <ListPageLoadErrorAlert
          message="无法加载审计日志"
          description={loadError}
          onRetry={() => void fetchPage(page)}
          onDismiss={() => setLoadError(null)}
        />
      ) : null}
      {loading && items.length === 0 ? (
        <ListPageTableSkeleton />
      ) : (
        <ProTable<AuditLogItem>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading && items.length > 0}
          search={false}
          options={{ reload: () => void fetchPage(page), density: true, setting: true }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => void fetchPage(p),
          }}
          cardBordered
          headerTitle={false}
          toolBarRender={() => [
            <Button key="reload" icon={<ReloadOutlined />} onClick={() => void fetchPage(page)}>
              刷新
            </Button>,
            <Button key="export" icon={<DownloadOutlined />} onClick={() => void handleExport()}>
              导出 CSV
            </Button>,
          ]}
          locale={{ emptyText: <AaaflowEmpty description="暂无审计记录" /> }}
        />
      )}
    </PageContainer>
  );
}
