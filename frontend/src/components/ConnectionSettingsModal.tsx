import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal, Input, message, Divider, Space, Select, Button, Typography,
} from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

import { chatApi, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { getChatLlmPrefs, setChatLlmPrefs } from '../services/llmPrefs';
import { setAccessToken } from '../services/authStorage';
import type { LlmOptionsResponse } from '../types';

const { Paragraph, Text } = Typography;

interface ConnectionSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Web 与桌面壳共用的 API 根地址 + 对话模型偏好 + 退出登录 */
export function ConnectionSettingsModal({ open, onClose }: ConnectionSettingsModalProps) {
  const navigate = useNavigate();
  const [apiInput, setApiInput] = useState('');
  const [llmOptions, setLlmOptions] = useState<LlmOptionsResponse | null>(null);
  const [llmProviderUi, setLlmProviderUi] = useState('anthropic');
  const [llmModelUi, setLlmModelUi] = useState('');

  const hydrateFromStorage = useCallback(() => {
    setApiInput(getApiBaseUrl());
    const lp = getChatLlmPrefs();
    setLlmProviderUi(lp.provider);
    setLlmModelUi(lp.model || '');
    void chatApi.llmOptions().then(setLlmOptions).catch(() => setLlmOptions(null));
  }, []);

  const handleSave = () => {
    const u = apiInput.trim();
    if (!/^https?:\/\/.+/i.test(u)) {
      message.error('请输入以 http:// 或 https:// 开头的地址');
      return;
    }
    const prov = llmOptions?.providers.find((p) => p.id === llmProviderUi);
    if (prov && !prov.available) {
      message.error('当前选择的模型提供方在服务端未配置密钥，请检查 backend/.env');
      return;
    }
    setApiBaseUrl(u);
    setChatLlmPrefs(llmProviderUi, llmModelUi.trim() || null);
    onClose();
    message.success('已保存，页面将刷新');
    window.setTimeout(() => window.location.reload(), 400);
  };

  const handleLogout = () => {
    setAccessToken(null);
    onClose();
    navigate('/login');
  };

  return (
    <Modal
      title="连接与对话设置"
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      afterOpenChange={(visible) => {
        if (visible) hydrateFromStorage();
      }}
      okText="保存并刷新"
      cancelText="取消"
      width={480}
    >
      <Paragraph type="secondary" style={{ fontSize: 13 }}>
        后端 API 根路径（须含 <Text code>/api</Text>），本机 Docker 多为：
      </Paragraph>
      <Input
        value={apiInput}
        onChange={(e) => setApiInput(e.target.value)}
        placeholder="http://127.0.0.1:8000/api"
      />
      <Divider orientation="left" plain style={{ marginTop: 20 }}>
        对话模型
      </Divider>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        仅影响<strong>下一次新建对话</strong>；已开始的会话仍使用创建时的提供方与模型。
      </Paragraph>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Select
          style={{ width: '100%' }}
          value={llmProviderUi}
          options={(llmOptions?.providers ?? []).map((p) => ({
            value: p.id,
            label: p.available ? p.label : `${p.label}（未配置）`,
            disabled: !p.available,
          }))}
          onChange={(v) => {
            setLlmProviderUi(v);
            const def = llmOptions?.default_models[v];
            setLlmModelUi(def || '');
          }}
          placeholder="提供方"
        />
        <Select
          style={{ width: '100%' }}
          showSearch
          allowClear
          value={llmModelUi || undefined}
          placeholder="模型 ID（可清空用服务端默认）"
          options={(llmOptions?.providers ?? [])
            .find((p) => p.id === llmProviderUi)
            ?.models.map((m) => ({ value: m.id, label: m.label }))}
          onChange={(v) => setLlmModelUi(v || '')}
          optionFilterProp="label"
        />
        <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
          退出登录
        </Button>
      </Space>
    </Modal>
  );
}
