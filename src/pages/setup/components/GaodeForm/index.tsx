import { useEffect, useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { updateEnvConfigDataAPI, type GaodeMapEnvValue } from '@/api/config';
import type { SetupFormProps } from '../types';

export function GaodeForm({ row, onSaved }: SetupFormProps) {
  const [form] = Form.useForm<GaodeMapEnvValue>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = row?.value as unknown as GaodeMapEnvValue | undefined;
    form.setFieldsValue({
      regeo_key: value?.regeo_key ?? '',
    });
  }, [row, form]);

  const onFinish = async (values: GaodeMapEnvValue) => {
    if (!row) {
      message.error('未找到配置项，请检查后端 env_config 表');
      return;
    }
    setSaving(true);
    try {
      await updateEnvConfigDataAPI({ ...row, value: values as unknown as Record<string, unknown> });
      message.success('高德地图设置已保存');
      onSaved();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" size="large" onFinish={onFinish} className="w-full lg:w-[400px] md:ml-10">
      <Form.Item
        name="regeo_key"
        label="Web 服务 Key"
        extra="用于照片上传时将 EXIF 中的 GPS 坐标解析为拍摄地点（高德控制台申请「Web 服务」类型 Key）。未配置时地点以经纬度形式保存。"
      >
        <Input.Password placeholder="请输入高德 Web 服务 Key" autoComplete="off" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} className="w-full">
          确定
        </Button>
      </Form.Item>
    </Form>
  );
}
