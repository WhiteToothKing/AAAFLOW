import { useEffect, useState } from 'react';
import {
  Tag, Space, Button, Modal, Form, Input, Switch, message,
} from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined, ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import type { ComfyUIWorkflow } from '../types';
import { workflowApi } from '../services/api';
import { AaaflowEmpty } from '../components/AaaflowEmpty';
import { ListPageLoadErrorAlert, ListPageTableSkeleton } from '../components/listPageShared';
const { TextArea } = Input;

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState<ComfyUIWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchWorkflows = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await workflowApi.list(false);
      setWorkflows(data);
    } catch {
      const msg = '加载失败，请检查网络、登录是否有效，或确认管理员权限';
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      let wfJson: Record<string, unknown>;
      try {
        wfJson = JSON.parse(values.workflow_json as string);
      } catch {
        message.error('工作流JSON格式无效');
        return;
      }

      await workflowApi.create({
        name: values.name as string,
        description: values.description as string,
        workflow_json: wfJson,
        version: (values.version as string) || '1.0',
        art_types: [],
        art_styles: [],
        is_active: true,
      });
      message.success('工作流创建成功');
      setModalOpen(false);
      form.resetFields();
      fetchWorkflows();
    } catch {
      message.error('创建失败');
    }
  };

  const toggleActive = async (wf: ComfyUIWorkflow) => {
    try {
      await workflowApi.update(wf.id, { is_active: !wf.is_active });
      message.success(wf.is_active ? '已停用' : '已启用');
      void fetchWorkflows();
    } catch {
      message.error('更新状态失败，请重试');
    }
  };

  const columns: ProColumns<ComfyUIWorkflow>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (_, record) => <Tag>{record.version}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (_, record) => (
        <Tag color={record.is_active ? 'green' : 'default'}>
          {record.is_active ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.is_active}
          onChange={() => toggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
  ];

  return (
    <PageContainer
      ghost
      breadcrumbRender={false}
      title={
        <Space>
          <ThunderboltOutlined />
          工作流
        </Space>
      }
      subTitle="管理组织内 ComfyUI 工作流：列表刷新、启用/停用与新建"
    >
      {loadError ? (
        <ListPageLoadErrorAlert
          message="无法加载工作流列表"
          description={loadError}
          onRetry={() => void fetchWorkflows()}
          onDismiss={() => setLoadError(null)}
        />
      ) : null}
      {loading && workflows.length === 0 ? (
        <ListPageTableSkeleton />
      ) : (
        <ProTable<ComfyUIWorkflow>
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          loading={loading && workflows.length > 0}
          search={false}
          options={{ reload: () => void fetchWorkflows(), density: true, setting: true }}
          pagination={false}
          cardBordered
          headerTitle={false}
          toolBarRender={() => [
            <Button key="reload" icon={<ReloadOutlined />} onClick={() => void fetchWorkflows()}>
              刷新
            </Button>,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              添加工作流
            </Button>,
          ]}
          locale={{ emptyText: <AaaflowEmpty description="暂无工作流" /> }}
        />
      )}

      <Modal
        title="添加ComfyUI工作流"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[{ required: true, whitespace: true, message: '请填写名称，便于同事辨认' }]}
            extra="在任务路由里会显示此名称。"
          >
            <Input placeholder="例如：SD XL 角色生成" />
          </Form.Item>
          <Form.Item name="description" label="描述" extra="选填，说明适用场景。">
            <Input placeholder="这张工作流适合做什么图" />
          </Form.Item>
          <Form.Item name="version" label="版本" extra="选填，如 1.0。">
            <Input placeholder="1.0" />
          </Form.Item>
          <Form.Item
            name="workflow_json"
            label="工作流 JSON"
            rules={[{ required: true, message: '请粘贴从 ComfyUI 导出的完整 JSON' }]}
            extra="在 ComfyUI 中使用「Save (API Format)」或导出 API 用工作流，整段粘贴到此处。"
          >
            <TextArea
              rows={12}
              placeholder="{ ... } 整段 JSON"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
