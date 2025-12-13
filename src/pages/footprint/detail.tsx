import { useState, useEffect } from 'react';
import { Card, Button, Image, message, Spin, Empty, Modal, Form, Input, Descriptions } from 'antd';
import { AiOutlineArrowLeft, AiOutlineDelete, AiOutlineEdit, AiOutlineEnvironment } from 'react-icons/ai';
import { useParams, useNavigate } from 'react-router';
import { getFootprintDetailAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import type { Footprint, UpdateFootprintParams } from '@/types/footprint';

const { TextArea } = Input;

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [footprint, setFootprint] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 加载足迹详情
  const loadFootprint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await getFootprintDetailAPI(Number(id));
      setFootprint(data);
      form.setFieldsValue({
        title: data.title,
        content: data.content,
        address: data.address,
        position: data.position,
        images: data.images?.join('\n') || '',
      });
    } catch {
      message.error('加载足迹详情失败');
      navigate('/footprints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprint();
  }, [id]);

  // 提交编辑
  const handleSubmitEdit = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      const images = values.images
        ? values.images
            .split('\n')
            .map((url: string) => url.trim())
            .filter((url: string) => url)
        : [];

      const params = {
        ...values,
        images: images.length > 0 ? images : undefined,
      };

      await updateFootprintAPI(Number(id), params as UpdateFootprintParams);
      message.success('更新足迹成功');
      setIsEditModalOpen(false);
      loadFootprint();
    } catch (error: any) {
      if (error?.errorFields) {
        return; // 表单验证错误，不显示错误消息
      }
      message.error('更新足迹失败');
    }
  };

  // 删除足迹
  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteFootprintAPI(Number(id));
      message.success('删除足迹成功');
      navigate('/footprints');
    } catch {
      message.error('删除足迹失败');
    }
  };

  // 格式化位置坐标
  const formatPosition = (position?: string) => {
    if (!position) return null;
    const [lng, lat] = position.split(',');
    return { lng: parseFloat(lng), lat: parseFloat(lat) };
  };

  // 打开地图（如果支持）
  const handleOpenMap = (position?: string) => {
    if (!position) {
      message.warning('该足迹没有位置信息');
      return;
    }
    const [lng, lat] = position.split(',');
    // 使用高德地图或百度地图
    const url = `https://uri.amap.com/marker?position=${lng},${lat}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!footprint) {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty description="足迹不存在" />
      </div>
    );
  }

  const position = formatPosition(footprint.position);

  return (
    <div className="space-y-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineArrowLeft />} onClick={() => navigate('/footprints')} />
            <span className="text-xl font-semibold">足迹详情</span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineEdit />} onClick={() => setIsEditModalOpen(true)}>
              编辑
            </Button>
            <Button danger icon={<AiOutlineDelete />} onClick={() => setIsDeleteModalOpen(true)}>
              删除
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* 标题 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{footprint.title}</h2>
            <div className="text-gray-500 text-sm">创建于 {new Date(footprint.create_time).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          {/* 内容描述 */}
          {footprint.content && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-700">内容描述</h3>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{footprint.content}</p>
            </div>
          )}

          {/* 地址和位置信息 */}
          {(footprint.address || footprint.position) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">位置信息</h3>
              <Descriptions column={1} bordered size="small">
                {footprint.address && (
                  <Descriptions.Item label="地址">
                    <div className="flex items-center gap-2">
                      <AiOutlineEnvironment className="text-blue-500" />
                      <span>{footprint.address}</span>
                    </div>
                  </Descriptions.Item>
                )}
                {footprint.position && (
                  <Descriptions.Item label="坐标">
                    <div className="flex items-center gap-2">
                      <span>
                        经度: {position?.lng}, 纬度: {position?.lat}
                      </span>
                      <Button type="link" size="small" icon={<AiOutlineEnvironment />} onClick={() => handleOpenMap(footprint.position)}>
                        查看地图
                      </Button>
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          {/* 图片展示 */}
          {footprint.images && footprint.images.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">图片 ({footprint.images.length})</h3>
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {footprint.images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <Image
                        src={imageUrl}
                        alt={`${footprint.title} - 图片 ${index + 1}`}
                        className="w-full h-full object-cover"
                        preview={{
                          mask: '预览',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">图片</h3>
              <Empty description="暂无图片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
        </div>
      </Card>

      {/* 编辑弹窗 */}
      <Modal title="编辑足迹" open={isEditModalOpen} onOk={handleSubmitEdit} onCancel={() => setIsEditModalOpen(false)} okText="确定" cancelText="取消" width={600}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 100, message: '标题不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item label="内容描述" name="content" rules={[{ max: 500, message: '内容描述不能超过500个字符' }]}>
            <TextArea rows={4} placeholder="请输入内容描述（可选）" />
          </Form.Item>
          <Form.Item label="地址" name="address" rules={[{ max: 200, message: '地址不能超过200个字符' }]}>
            <Input placeholder="请输入地址（可选）" />
          </Form.Item>
          <Form.Item label="位置坐标" name="position" rules={[{ pattern: /^-?\d+\.?\d*,-?\d+\.?\d*$/, message: '格式错误，请输入：经度,纬度（例如：120.135,30.259）' }]} extra="格式：经度,纬度（例如：120.135,30.259）">
            <Input placeholder="请输入位置坐标（可选）" />
          </Form.Item>
          <Form.Item
            label="图片URL列表"
            name="images"
            extra="每行一个URL地址"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const urls = value
                    .split('\n')
                    .map((url: string) => url.trim())
                    .filter((url: string) => url);
                  const invalidUrls = urls.filter((url: string) => {
                    try {
                      new URL(url);
                      return false;
                    } catch {
                      return true;
                    }
                  });
                  if (invalidUrls.length > 0) {
                    return Promise.reject(new Error('请输入有效的URL地址'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <TextArea rows={4} placeholder="请输入图片URL，每行一个（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal title="确定删除此足迹吗？" open={isDeleteModalOpen} onOk={handleDelete} onCancel={() => setIsDeleteModalOpen(false)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
        <p>删除后将无法恢复，请谨慎操作。</p>
      </Modal>
    </div>
  );
};
