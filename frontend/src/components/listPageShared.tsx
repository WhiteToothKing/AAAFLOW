import { Alert, Button, Skeleton } from 'antd';

/** 列表页（ProTable）首屏加载骨架，与 PageContainer 内容区左右留白一致 */
export function ListPageTableSkeleton({ rows = 8 }: { rows?: number }) {
  return <Skeleton active paragraph={{ rows }} style={{ padding: '0 24px 24px' }} />;
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
        <Button size="small" type="primary" onClick={onRetry}>
          重试
        </Button>
      }
      closable={!!onDismiss}
      onClose={onDismiss}
      style={{ marginBottom: 16 }}
    />
  );
}
