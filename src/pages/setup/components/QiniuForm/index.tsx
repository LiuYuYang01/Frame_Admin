import { useEffect, useState } from 'react';
import { Button, Form, Input, Select, message } from 'antd';
import { updateEnvConfigDataAPI, type QiniuStorageEnvValue } from '@/api/config';
import type { SetupFormProps } from '../types';

const ZONE_OPTIONS = [
  { value: 'Zone_z0', label: '华东 (Zone_z0)' },
  { value: 'Zone_cn_east_2', label: '华东-浙江2 (Zone_cn_east_2)' },
  { value: 'Zone_z1', label: '华北 (Zone_z1)' },
  { value: 'Zone_z2', label: '华南 (Zone_z2)' },
  { value: 'Zone_na0', label: '北美 (Zone_na0)' },
  { value: 'Zone_as0', label: '东南亚 (Zone_as0)' },
];

export function QiniuForm({ row, onSaved }: SetupFormProps) {
  const [form] = Form.useForm<QiniuStorageEnvValue>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = row?.value as unknown as QiniuStorageEnvValue | undefined;
    form.setFieldsValue({
      access_key: value?.access_key ?? '',
      secret_key: value?.secret_key ?? '',
      domain: value?.domain ?? '',
      bucket_name: value?.bucket_name ?? '',
      zone: value?.zone ?? 'Zone_z2',
    });
  }, [row, form]);

  const onFinish = async (values: QiniuStorageEnvValue) => {
    if (!row) {
      message.error('未找到配置项，请检查后端 env_config 表');
      return;
    }
    setSaving(true);
    try {
      await updateEnvConfigDataAPI({ ...row, value: values as unknown as Record<string, unknown> });
      message.success('七牛云存储设置已保存');
      onSaved();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" size="large" onFinish={onFinish} className="w-full lg:w-[400px] md:ml-10">
      <Form.Item name="access_key" label="Access Key" rules={[{ required: true, message: '请输入 Access Key' }]}>
        <Input.Password placeholder="请输入七牛云 Access Key" autoComplete="off" />
      </Form.Item>
      <Form.Item name="secret_key" label="Secret Key" rules={[{ required: true, message: '请输入 Secret Key' }]}>
        <Input.Password placeholder="请输入七牛云 Secret Key" autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="domain" label="访问域名" rules={[{ required: true, message: '请输入访问域名' }]}>
        <Input placeholder="https://cdn.example.com" />
      </Form.Item>
      <Form.Item name="bucket_name" label="存储桶" rules={[{ required: true, message: '请输入存储桶名称' }]}>
        <Input placeholder="my-bucket" />
      </Form.Item>
      <Form.Item name="zone" label="存储区域" rules={[{ required: true, message: '请选择存储区域' }]}>
        <Select options={ZONE_OPTIONS} placeholder="请选择存储区域" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} className="w-full">
          确定
        </Button>
      </Form.Item>
    </Form>
  );
}
