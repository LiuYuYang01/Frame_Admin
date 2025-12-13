import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Dropdown, Image } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineEllipsis, AiOutlineSearch, AiOutlinePlus } from 'react-icons/ai';
import { useNavigate } from 'react-router';
import { Tooltip } from '@heroui/react';
import { getFootprintListAPI, createFootprintAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import type { Footprint, CreateFootprintParams, UpdateFootprintParams } from '@/types/footprint';
import type { MenuProps } from 'antd';

const { TextArea } = Input;

export default () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFootprint, setEditingFootprint] = useState<Footprint | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // 防抖处理搜索关键词
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPagination({ ...pagination, page: 1 });
    }, 300);
    return () => clearTimeout(handler);
  }, [keyword]);

  // 加载足迹列表
  const loadFootprints = async () => {
    try {
      setLoading(true);
      const { data } = await getFootprintListAPI({
        ...pagination,
        keyword: debouncedKeyword || undefined,
      });
      setFootprints(data.result);
      setTotal(data.total);
    } catch {
      message.error('加载足迹列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprints();
  }, [pagination, debouncedKeyword]);

  // 打开创建/编辑弹窗
  const handleOpenModal = (footprint?: Footprint) => {
    if (footprint) {
      setEditingFootprint(footprint);
      form.setFieldsValue({
        title: footprint.title,
        content: footprint.content,
        address: footprint.address,
        position: footprint.position,
        images: footprint.images?.join('\n') || '',
      });
    } else {
      setEditingFootprint(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
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

      if (editingFootprint) {
        // 编辑
        await updateFootprintAPI(editingFootprint.id, params as UpdateFootprintParams);
        message.success('更新足迹成功');
      } else {
        // 创建
        await createFootprintAPI(params as CreateFootprintParams);
        message.success('创建足迹成功');
      }
      setIsModalOpen(false);
      loadFootprints();
    } catch (error: any) {
      if (error?.errorFields) {
        return; // 表单验证错误，不显示错误消息
      }
      message.error(editingFootprint ? '更新足迹失败' : '创建足迹失败');
    }
  };

  // 删除足迹
  const handleDelete = async (id: number) => {
    try {
      await deleteFootprintAPI(id);
      message.success('删除足迹成功');
      loadFootprints();
    } catch {
      message.error('删除足迹失败');
    }
  };

  // 查看足迹详情
  const handleViewFootprint = (id: number) => {
    navigate(`/footprints/${id}`);
  };

  // 获取操作菜单项
  const getMenuItems = (footprint: Footprint): MenuProps['items'] => [
    {
      key: 'edit',
      label: <span className="text-[15px]">编辑</span>,
      icon: <AiOutlineEdit className="!text-xl" />,
      onClick: (e) => {
        e?.domEvent?.stopPropagation();
        handleOpenModal(footprint);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: <span className="text-[15px]">删除</span>,
      icon: <AiOutlineDelete className="!text-xl" />,
      danger: true,
      onClick: (e) => {
        e?.domEvent?.stopPropagation();
        Modal.confirm({
          title: '确定删除此足迹吗？',
          content: '删除后将无法恢复',
          okText: '确定',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => handleDelete(footprint.id),
        });
      },
    },
  ];

  // 格式化位置坐标
  const formatPosition = (position?: string) => {
    if (!position) return '未设置';
    const [lng, lat] = position.split(',');
    return `经度: ${lng}, 纬度: ${lat}`;
  };

  return (
    <div>
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">足迹管理</span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Input placeholder="搜索标题或地址" prefix={<AiOutlineSearch />} value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear style={{ width: 200 }} />
            <Button type="primary" icon={<AiOutlinePlus />} onClick={() => handleOpenModal()}>
              创建足迹
            </Button>
          </div>
        }
        className="[&_.ant-card-body]:min-h-[calc(100vh-180px)]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spin size="large" tip="加载中..." />
          </div>
        ) : footprints.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                暂无足迹，点击
                <Button type="link" onClick={() => handleOpenModal()}>
                  创建足迹
                </Button>
              </span>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {footprints.map((footprint) => (
                <Tooltip
                  key={footprint.id}
                  content={
                    <div className="px-1 py-2 max-w-xs">
                      <div className="text-small font-semibold mb-2">{footprint.title}</div>
                      {footprint.content && <div className="text-tiny leading-relaxed mb-2">{footprint.content}</div>}
                      {footprint.address && <div className="text-tiny text-default-400 mb-1">📍 {footprint.address}</div>}
                      {footprint.position && <div className="text-tiny text-default-400 mb-1">🗺️ {formatPosition(footprint.position)}</div>}
                      <div className="text-tiny text-default-400 pt-2 border-t border-default-200">创建于 {new Date(footprint.create_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                  }
                  placement="top"
                  delay={300}
                  closeDelay={0}
                  classNames={{
                    base: 'max-w-md',
                    content: 'bg-content1 border border-default-200 shadow-xl',
                  }}
                >
                  <div className="relative group cursor-pointer" onClick={() => handleViewFootprint(footprint.id)}>
                    <div className="bg-white rounded-xl p-4 transition-all hover:-translate-y-1 overflow-hidden shadow-sm hover:shadow-md">
                      {/* 图片区域 */}
                      {footprint.images && footprint.images.length > 0 ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                          <Image src={footprint.images[0]} alt={footprint.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" preview={false} />
                          {footprint.images.length > 1 && <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">+{footprint.images.length - 1}</div>}
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                          <span className="text-gray-400 text-sm">暂无图片</span>
                        </div>
                      )}

                      {/* 标题和内容 */}
                      <div className="mb-2">
                        <div className="text-gray-800 font-semibold truncate mb-1 group-hover:text-blue-500 transition-colors" title={footprint.title}>
                          {footprint.title}
                        </div>
                        {footprint.content && (
                          <div className="text-gray-600 text-sm line-clamp-2 mb-2" title={footprint.content}>
                            {footprint.content}
                          </div>
                        )}
                        {footprint.address && (
                          <div className="text-gray-500 text-xs truncate mb-1" title={footprint.address}>
                            📍 {footprint.address}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="absolute bottom-4 right-4 border transition-all rounded-md hidden group-hover:block">
                        <Dropdown menu={{ items: getMenuItems(footprint) }} trigger={['click']}>
                          <Button type="text" size="small" icon={<AiOutlineEllipsis />} className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:shadow-xl border-0" onClick={(e) => e.stopPropagation()} />
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>

            {/* 分页 */}
            {total > pagination.limit && (
              <div className="flex justify-center mt-8">
                <Button disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>
                  上一页
                </Button>
                <span className="mx-4 flex items-center">
                  第 {pagination.page} / {Math.ceil(total / pagination.limit)} 页，共 {total} 个足迹
                </span>
                <Button disabled={pagination.page >= Math.ceil(total / pagination.limit)} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal title={editingFootprint ? '编辑足迹' : '创建足迹'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} okText="确定" cancelText="取消" width={600}>
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
    </div>
  );
};
