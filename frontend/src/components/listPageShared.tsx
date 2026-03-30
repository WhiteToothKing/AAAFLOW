import { Alert, Button, Skeleton, Space } from 'antd';
import { brandColors, shadows } from '../designTokens';

/** 列表页（ProTable）首屏加载骨架 — branded shimmer effect */
export function ListPageTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="list-page-skeleton animate-fade-in" style={{
      padding: '0 24px 24px',
      background: '#fff',
      borderRadius: 12,
      boxShadow: shadows.card,
    }}>
      <div style={{ padding: '20px 0 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Skeleton.Button active size="small" style={{ width: 80 }} />
        <Skeleton.Button active size="small" style={{ width: 80 }} />
        <div style={{ flex: 1 }} />
        <Skeleton.Button active size="small" style={{ width: 100 }} />
      </div>
      <Skeleton active paragraph={{ rows }} />
    </div>
  );
}

type ListPageLoadErrorAlertProps = {
  message: string;
  description?: string;
  onRetry: () => void;
  onDismiss?: () => void;
};

/** 列表页数据加载失败：统一文案区 + 重试 + 可关闭 */
export function ListPageLoadErrorAlert({
  message,
  description,
  onRetry,
  onDismiss,
}: ListPageLoadErrorAlertProps) {
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      {...(description ? { description } : {})}
      action={
        <Button size="small" type="primary" onClick={onRetry} className="btn-gradient">
          重试
        </Button>
      }
      closable={!!onDismiss}
      onClose={onDismiss}
      style={{ marginBottom: 16, borderRadius: 10 }}
    />
  );
}

/** Full-page loading skeleton for detail pages */
export function DetailPageSkeleton() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <Skeleton.Input active size="large" style={{ width: 300, marginBottom: 24 }} />
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: shadows.card }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Skeleton.Input active style={{ width: '100%' }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Space>
      </div>
    </div>
  );
}
