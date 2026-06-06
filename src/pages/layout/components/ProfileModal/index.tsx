import { useEffect, useState } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { updateProfileAPI } from '@/api';
import { useUserStore } from '@/stores';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileFormValues {
  username: string;
  name: string;
  old_password?: string;
  new_password?: string;
  confirm_password?: string;
}

export default ({ open, onClose }: ProfileModalProps) => {
  const [form] = Form.useForm<ProfileFormValues>();
  const { user, setUser } = useUserStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      username: user?.username || '',
      name: user?.name || '',
      old_password: '',
      new_password: '',
      confirm_password: '',
    });
  }, [open, user, form]);

  const onFinish = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const params = {
        username: values.username,
        name: values.name,
        ...(values.new_password
          ? {
              old_password: values.old_password,
              new_password: values.new_password,
            }
          : {}),
      };

      const { data } = await updateProfileAPI(params);
      if (data) setUser(data);
      message.success('资料更新成功');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="个人中心"
      open={open}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
        <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
          <Input placeholder="请输入登录账号" autoComplete="off" />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入显示名称" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="old_password"
          label="当前密码"
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!getFieldValue('new_password') || value) return Promise.resolve();
                return Promise.reject(new Error('修改密码时需输入当前密码'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="修改密码时必填" autoComplete="off" />
        </Form.Item>
        <Form.Item name="new_password" label="新密码" rules={[{ min: 6, message: '新密码至少 6 位' }]}>
          <Input.Password placeholder="不修改请留空" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={['new_password']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const newPassword = getFieldValue('new_password');
                if (!newPassword || newPassword === value) return Promise.resolve();
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="再次输入新密码" autoComplete="off" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
