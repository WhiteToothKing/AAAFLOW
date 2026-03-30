import { Card, Col, Row, Skeleton, Space } from 'antd';

/**
 * Full-page list layout placeholder: stat row + table-like block with shimmer (see `index.css` `.list-page-skeleton`).
 */
export function ListPageSkeleton() {
  return (
    <div className="list-page-skeleton page-transition-subtle" style={{ width: '100%' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          {[0, 1, 2, 3].map((i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card size="small" styles={{ body: { padding: 16 } }}>
                <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 2, width: ['100%', '80%'] }} />
              </Card>
            </Col>
          ))}
        </Row>

        <Card styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Skeleton.Input active size="large" block style={{ height: 40, borderRadius: 8 }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr 1fr',
                gap: 16,
                marginBottom: 8,
              }}
            >
              <Skeleton.Input active size="small" style={{ height: 22 }} />
              <Skeleton.Input active size="small" style={{ height: 22 }} />
              <Skeleton.Input active size="small" style={{ height: 22 }} />
              <Skeleton.Input active size="small" style={{ height: 22 }} />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                active
                title={false}
                paragraph={{ rows: 1, width: ['100%'] }}
                style={{ marginBottom: i === 4 ? 0 : 4 }}
              />
            ))}
          </Space>
        </Card>
      </Space>
    </div>
  );
}
