import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Dropdown, Image, Select, Checkbox, Pagination } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineEllipsis, AiOutlineSearch, AiOutlinePlus } from 'react-icons/ai';
import { useNavigate } from 'react-router';
import { Tooltip } from '@heroui/react';
import { getFootprintListAPI, createFootprintAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import { getAlbumListAPI, getAlbumPhotosAPI } from '@/api/album';
import type { Footprint, CreateFootprintParams, UpdateFootprintParams } from '@/types/footprint';
import type { Album } from '@/types/album';
import type { Photo } from '@/types/photo';
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
  const [isPhotoSelectModalOpen, setIsPhotoSelectModalOpen] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLimit, setPhotosLimit] = useState(24);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [photoSearchKeyword, setPhotoSearchKeyword] = useState('');
  const [debouncedPhotoKeyword, setDebouncedPhotoKeyword] = useState('');

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

  // 加载相册列表
  const loadAlbums = async () => {
    try {
      const { data } = await getAlbumListAPI({ page: 1, limit: 100 });
      setAlbums(data.result);
      if (data.result.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(data.result[0].id);
      }
    } catch {
      message.error('加载相册列表失败');
    }
  };

  // 加载相册照片
  const loadAlbumPhotos = async (albumId: number, page = photosPage, limit = photosLimit) => {
    try {
      setPhotosLoading(true);
      const { data } = await getAlbumPhotosAPI(albumId, {
        page,
        limit,
        width: 300,
        height: 300,
        keyword: debouncedPhotoKeyword || undefined,
      });
      setPhotos(data.result);
      setPhotosTotal(data.total);
    } catch {
      message.error('加载照片列表失败');
    } finally {
      setPhotosLoading(false);
    }
  };

  // 防抖处理照片搜索关键词
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPhotoKeyword(photoSearchKeyword.trim());
      setPhotosPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [photoSearchKeyword]);

  // 当相册ID或搜索关键词变化时加载照片
  useEffect(() => {
    if (selectedAlbumId && isPhotoSelectModalOpen) {
      loadAlbumPhotos(selectedAlbumId, photosPage, photosLimit);
    }
  }, [selectedAlbumId, photosPage, photosLimit, debouncedPhotoKeyword, isPhotoSelectModalOpen]);

  // 打开创建/编辑弹窗
  const handleOpenModal = (footprint?: Footprint) => {
    if (footprint) {
      setEditingFootprint(footprint);
      const imageUrls = footprint.images || [];
      form.setFieldsValue({
        title: footprint.title,
        content: footprint.content,
        address: footprint.address,
        position: footprint.position,
        images: imageUrls,
      });
      setSelectedPhotoUrls(imageUrls);
    } else {
      setEditingFootprint(null);
      form.resetFields();
      setSelectedPhotoUrls([]);
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const images = values.images && Array.isArray(values.images) ? values.images.filter((url: string) => url) : [];

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
      setSelectedPhotoUrls([]);
      loadFootprints();
    } catch (error: any) {
      if (error?.errorFields) {
        return; // 表单验证错误，不显示错误消息
      }
      message.error(editingFootprint ? '更新足迹失败' : '创建足迹失败');
    }
  };

  // 打开选择照片弹窗
  const handleOpenPhotoSelect = () => {
    setIsPhotoSelectModalOpen(true);
    loadAlbums();
    // 初始化选中状态为当前表单中的图片URL
    const currentImages = form.getFieldValue('images') || [];
    setSelectedPhotoUrls(Array.isArray(currentImages) ? currentImages : []);
    setPhotosPage(1);
    setPhotoSearchKeyword('');
  };

  // 确认选择照片
  const handleConfirmPhotoSelect = () => {
    form.setFieldsValue({ images: selectedPhotoUrls });
    setIsPhotoSelectModalOpen(false);
  };

  // 切换照片选中状态
  const togglePhotoSelection = (photoUrl: string) => {
    setSelectedPhotoUrls((prev) => (prev.includes(photoUrl) ? prev.filter((url) => url !== photoUrl) : [...prev, photoUrl]));
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
            label="图片"
            name="images"
            extra={
              <div className="flex items-center justify-between mt-1">
                <span>从相册中选择图片</span>
                <Button type="link" size="small" onClick={handleOpenPhotoSelect}>
                  选择图片
                </Button>
              </div>
            }
          >
            <div className="min-h-[100px] border border-dashed border-gray-300 rounded p-3">
              {form.getFieldValue('images') && form.getFieldValue('images').length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {(form.getFieldValue('images') || []).map((url: string, index: number) => (
                    <div key={index} className="relative aspect-square rounded overflow-hidden">
                      <Image src={url} alt={`图片 ${index + 1}`} className="w-full h-full object-cover" preview={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-400">暂无图片，点击"选择图片"按钮从相册中选择</div>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 选择照片弹窗 */}
      <Modal
        title="从相册选择图片"
        open={isPhotoSelectModalOpen}
        onOk={handleConfirmPhotoSelect}
        onCancel={() => {
          setIsPhotoSelectModalOpen(false);
          setSelectedPhotoUrls([]);
          setPhotoSearchKeyword('');
        }}
        okText="确定"
        cancelText="取消"
        width={900}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Select
              placeholder="选择相册"
              value={selectedAlbumId}
              onChange={(value) => {
                setSelectedAlbumId(value);
                setPhotosPage(1);
                setSelectedPhotoUrls([]);
              }}
              style={{ width: 300 }}
              options={albums.map((album) => ({ label: album.name, value: album.id }))}
            />
            <div className="text-gray-600">已选择 {selectedPhotoUrls.length} 张图片</div>
          </div>

          {selectedAlbumId && (
            <>
              <Input placeholder="搜索照片名称" prefix={<AiOutlineSearch />} value={photoSearchKeyword} onChange={(e) => setPhotoSearchKeyword(e.target.value)} allowClear />

              {photosLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spin />
                </div>
              ) : photos.length === 0 ? (
                <Empty description="该相册暂无照片" />
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2">
                    {photos.map((photo) => {
                      const isSelected = selectedPhotoUrls.includes(photo.url);
                      return (
                        <div key={photo.id} className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`} onClick={() => togglePhotoSelection(photo.url)}>
                          <div className="h-32 rounded-lg overflow-hidden">
                            <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                          </div>
                          <Checkbox checked={isSelected} className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()} onChange={() => togglePhotoSelection(photo.url)} />
                          <div className={`p-2 bg-white text-xs truncate ${isSelected ? 'text-blue-500' : 'text-gray-700'}`}>{photo.name}</div>
                        </div>
                      );
                    })}
                  </div>
                  {photosTotal > photosLimit && (
                    <div className="flex justify-center">
                      <Pagination
                        current={photosPage}
                        pageSize={photosLimit}
                        total={photosTotal}
                        showSizeChanger
                        showTotal={(total) => `共 ${total} 张`}
                        pageSizeOptions={['12', '24', '48', '96']}
                        onChange={(page, pageSize) => {
                          setPhotosPage(page);
                          setPhotosLimit(pageSize);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {!selectedAlbumId && <Empty description="请先选择相册" />}
        </div>
      </Modal>
    </div>
  );
};
