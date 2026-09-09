import { useEffect, useState } from 'react';
import { Form, Input, Modal, Upload, message, Spin } from 'antd';
import { FiCamera } from 'react-icons/fi';
import { updateProfileAPI, uploadAvatarAPI } from '@/api';
import { useUserStore } from '@/stores';
import { compressImage } from '@/utils/compressImage';

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

const AVATAR_MAX_LONG_EDGE = 512;

export default ({ open, onClose }: ProfileModalProps) => {
  const [form] = Form.useForm<ProfileFormValues>();
  const { user, setUser } = useUserStore();
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAvatar(user?.avatar || '');
    form.setFieldsValue({
      username: user?.username || '',
      name: user?.name || '',
      old_password: '',
      new_password: '',
      confirm_password: '',
    });
  }, [open, user, form]);

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return false;
    }

    setAvatarUploading(true);
    try {
      const { file: compressed } = await compressImage(file, {
        quality: 80,
        maxLongEdge: AVATAR_MAX_LONG_EDGE,
      });
      const { data } = await uploadAvatarAPI(compressed);
      if (data) {
        setAvatar(data.avatar);
        setUser(data);
      }
      message.success('头像更新成功');
    } catch (error) {
      console.error(error);
    } finally {
      setAvatarUploading(false);
    }

    return false;
  };

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

  const avatarFallback = user?.name?.charAt(0) || user?.username?.charAt(0) || 'F';

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
      <div className="mt-4 flex flex-col items-center">
        <Upload
          accept="image/*"
          showUploadList={false}
          disabled={avatarUploading}
          beforeUpload={handleAvatarUpload}
        >
          <div className="group relative cursor-pointer">
            <Spin spinning={avatarUploading}>
              {avatar ? (
                <img
                  src={avatar}
                  alt={user?.name || 'avatar'}
                  className="size-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                  {avatarFallback}
                </div>
              )}
            </Spin>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <FiCamera className="size-5 text-white" />
            </div>
          </div>
        </Upload>
        <p className="mt-2 text-xs text-ink-faint">点击头像更换，支持 jpg、png、webp 等格式</p>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入显示名称" autoComplete="off" />
        </Form.Item>

        <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
          <Input placeholder="请输入登录账号" autoComplete="off" />
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
