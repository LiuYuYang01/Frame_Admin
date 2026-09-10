import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Image, Select, Table, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineSearch, AiOutlinePlus } from 'react-icons/ai';
import { getFootprintListAPI, createFootprintAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import { getAlbumListAPI } from '@/api/album';
import type { Footprint, CreateFootprintParams, UpdateFootprintParams } from '@/types/footprint';
import type { Album } from '@/types/album';

const { TextArea } = Input;

export default () => {
  const [form] = Form.useForm();
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFootprint, setEditingFootprint] = useState<Footprint | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

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

  // 加载相册列表（供下拉选择）
  const loadAlbums = async () => {
    try {
      setAlbumsLoading(true);
      const { data } = await getAlbumListAPI({ page: 1, limit: 200 });
      setAlbums(data.result || []);
    } catch {
      message.error('加载相册列表失败');
    } finally {
      setAlbumsLoading(false);
    }
  };

  // 打开创建/编辑弹窗
  const handleOpenModal = (footprint?: Footprint) => {
    if (footprint) {
      setEditingFootprint(footprint);
      form.setFieldsValue({
        title: footprint.title,
        content: footprint.content,
        address: footprint.address,
        position: footprint.position,
        cover: footprint.cover,
        album_id: footprint.album_id,
      });
    } else {
      setEditingFootprint(null);
      form.resetFields();
    }
    setIsModalOpen(true);
    loadAlbums();
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const params = {
        ...values,
        cover: values.cover || undefined,
        album_id: values.album_id || undefined,
      };

      if (editingFootprint) {
        await updateFootprintAPI(editingFootprint.id, params as UpdateFootprintParams);
        message.success('更新足迹成功');
      } else {
        await createFootprintAPI(params as CreateFootprintParams);
        message.success('创建足迹成功');
      }
      setIsModalOpen(false);
      loadFootprints();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
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

  // 格式化位置坐标
  const formatPosition = (position?: string) => {
    if (!position) return '-';
    const [lng, lat] = position.split(',');
    return `${lng}, ${lat}`;
  };

  const handleConfirmDelete = (footprint: Footprint) => {
    Modal.confirm({
      title: '确定删除此足迹吗？',
      content: '删除后将无法恢复',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => handleDelete(footprint.id),
    });
  };

  const getFootprintCover = (record: Footprint) => record.cover || record.album_cover;

  const columns: ColumnsType<Footprint> = [
    {
      title: '封面',
      dataIndex: 'cover',
      width: 80,
      render: (_, record) => {
        const coverUrl = getFootprintCover(record);
        return (
          <div className="relative w-14 h-14 rounded overflow-hidden bg-canvas-deep">
            {coverUrl ? (
              <Image src={coverUrl} alt={record.title} width={56} height={56} className="object-cover" preview={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">无</div>
            )}
          </div>
        );
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string) => <span className="font-medium">{title}</span>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (content?: string) => content || '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      render: (address?: string) => address || '-',
    },
    {
      title: '坐标',
      dataIndex: 'position',
      width: 140,
      ellipsis: true,
      render: (position?: string) => formatPosition(position),
    },
    {
      title: '关联相册',
      dataIndex: 'album_name',
      width: 140,
      ellipsis: true,
      render: (albumName?: string) => albumName || <span className="text-ink-faint">未关联</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      width: 120,
      render: (time: string) =>
        new Date(time).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={15}>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<AiOutlineEdit className="text-base" />} onClick={() => handleOpenModal(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<AiOutlineDelete className="text-base" />} onClick={() => handleConfirmDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
        className="[&_.ant-card-body]:min-h-[calc(100vh-180px)] [&_.ant-card-body]:p-0!"
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={footprints}
          scroll={{ x: 1000 }}
          pagination={{
            size: 'default',
            current: pagination.page,
            pageSize: pagination.limit,
            total,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 个足迹`,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ page, limit: pageSize }),
          }}
          locale={{
            emptyText: (
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
            ),
          }}
        />
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
          <Form.Item label="关联相册" name="album_id" extra="选择相册后，前端足迹详情将展示该相册中的照片，并支持一键跳转">
            <Select
              placeholder="请选择关联相册（可选）"
              allowClear
              loading={albumsLoading}
              notFoundContent={albumsLoading ? <Spin size="small" /> : '暂无相册'}
              options={albums.map((album) => ({ label: album.name, value: album.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="封面图片URL" name="cover" rules={[{ max: 500, message: 'URL不能超过500个字符' }]} extra="留空则使用关联相册的封面">
            <Input placeholder="请输入封面图片URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
