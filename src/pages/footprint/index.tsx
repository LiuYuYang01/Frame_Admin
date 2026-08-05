import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Image, Select, Checkbox, Pagination, Table, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineSearch, AiOutlinePlus, AiOutlineClose } from 'react-icons/ai';
import { getFootprintListAPI, createFootprintAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import { getAlbumListAPI, getAlbumPhotosAPI } from '@/api/album';
import type { Footprint, CreateFootprintParams, UpdateFootprintParams } from '@/types/footprint';
import type { Album } from '@/types/album';
import type { Photo } from '@/types/photo';

const { TextArea } = Input;

export default () => {
  const [form] = Form.useForm();
  const coverValue = Form.useWatch('cover', form);
  const imagesValue = Form.useWatch('images', form);
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
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null);
  const [photoSelectMode, setPhotoSelectMode] = useState<'cover' | 'images'>('images');
  const [photoSearchKeyword, setPhotoSearchKeyword] = useState('');
  const [debouncedPhotoKeyword, setDebouncedPhotoKeyword] = useState('');

  const normalizePhotoUrl = (url?: string | null) => {
    if (!url) return '';
    const [baseUrl] = url.split('?r=');
    return baseUrl || url;
  };

  const getPhotoValueUrl = (photo: Photo) => normalizePhotoUrl(photo.original_url || photo.url);

  const resolveDefaultAlbumId = (albumList: Album[], address?: string) => {
    if (!albumList.length) return null;
    const normalizedAddress = (address || '').trim();
    if (!normalizedAddress) return albumList[0].id;

    const exactMatch = albumList.find((album) => album.name.trim() === normalizedAddress);
    if (exactMatch) return exactMatch.id;

    const fuzzyMatch = albumList.find((album) => normalizedAddress.includes(album.name.trim()) || album.name.trim().includes(normalizedAddress));
    return fuzzyMatch?.id ?? albumList[0].id;
  };

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
  const loadAlbums = async (preferredAddress?: string) => {
    try {
      const { data } = await getAlbumListAPI({ page: 1, limit: 100 });
      const albumList = data.result || [];
      setAlbums(albumList);
      setSelectedAlbumId(resolveDefaultAlbumId(albumList, preferredAddress));
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
      const imageUrls = (footprint.images || []).map((url) => normalizePhotoUrl(url)).filter(Boolean);
      const coverUrl = normalizePhotoUrl(footprint.cover);
      form.setFieldsValue({
        title: footprint.title,
        content: footprint.content,
        address: footprint.address,
        position: footprint.position,
        cover: coverUrl || undefined,
        images: imageUrls,
      });
      setSelectedPhotoUrls(imageUrls);
      setSelectedCoverUrl(coverUrl || null);
    } else {
      setEditingFootprint(null);
      form.resetFields();
      setSelectedPhotoUrls([]);
      setSelectedCoverUrl(null);
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const images = values.images && Array.isArray(values.images) ? values.images.map((url: string) => normalizePhotoUrl(url)).filter((url: string) => url) : [];
      const cover = normalizePhotoUrl(values.cover);

      const params = {
        ...values,
        cover: cover || undefined,
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
      setSelectedCoverUrl(null);
      loadFootprints();
    } catch (error: any) {
      if (error?.errorFields) {
        return; // 表单验证错误，不显示错误消息
      }
      message.error(editingFootprint ? '更新足迹失败' : '创建足迹失败');
    }
  };

  // 打开选择照片弹窗
  const handleOpenPhotoSelect = (mode: 'cover' | 'images') => {
    setPhotoSelectMode(mode);
    setIsPhotoSelectModalOpen(true);
    const currentAddress = (form.getFieldValue('address') as string | undefined)?.trim();
    loadAlbums(currentAddress);

    if (mode === 'cover') {
      const currentCover = normalizePhotoUrl(form.getFieldValue('cover')) || null;
      setSelectedCoverUrl(currentCover);
      setSelectedPhotoUrls(currentCover ? [currentCover] : []);
    } else {
      const currentImages = form.getFieldValue('images') || [];
      setSelectedPhotoUrls(Array.isArray(currentImages) ? currentImages.map((url: string) => normalizePhotoUrl(url)).filter(Boolean) : []);
      setSelectedCoverUrl(null);
    }

    setPhotosPage(1);
    setPhotoSearchKeyword('');
  };

  // 确认选择照片
  const handleConfirmPhotoSelect = () => {
    if (photoSelectMode === 'cover') {
      form.setFieldsValue({ cover: selectedCoverUrl || undefined });
    } else {
      form.setFieldsValue({ images: selectedPhotoUrls });
    }
    setIsPhotoSelectModalOpen(false);
  };

  // 切换照片选中状态
  const togglePhotoSelection = (photoUrl: string) => {
    const normalizedUrl = normalizePhotoUrl(photoUrl);
    if (photoSelectMode === 'cover') {
      setSelectedCoverUrl((prev) => (prev === normalizedUrl ? null : normalizedUrl));
      setSelectedPhotoUrls((prev) => (prev[0] === normalizedUrl ? [] : [normalizedUrl]));
      return;
    }

    setSelectedPhotoUrls((prev) => (prev.includes(normalizedUrl) ? prev.filter((url) => url !== normalizedUrl) : [...prev, normalizedUrl]));
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

  const getFootprintCover = (record: Footprint) => record.cover || record.images?.[0];

  // 从表单中移除单张图片
  const handleRemoveImage = (targetUrl: string) => {
    const currentImages = form.getFieldValue('images') || [];
    const normalizedTarget = normalizePhotoUrl(targetUrl);
    const nextImages = Array.isArray(currentImages)
      ? currentImages.map((url: string) => normalizePhotoUrl(url)).filter((url: string) => url && url !== normalizedTarget)
      : [];
    form.setFieldsValue({ images: nextImages });
    setSelectedPhotoUrls(nextImages);
  };

  const columns: ColumnsType<Footprint> = [
    {
      title: '封面',
      dataIndex: 'cover',
      width: 80,
      render: (_, record) => {
        const coverUrl = getFootprintCover(record);
        const imageCount = record.images?.length || 0;

        return (
          <div className="relative w-14 h-14 rounded overflow-hidden bg-gray-100">
            {coverUrl ? (
              <>
                <Image src={coverUrl} alt={record.title} width={56} height={56} className="object-cover" preview={false} />
                {imageCount > 1 && <div className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1 rounded-bl">+{imageCount - 1}</div>}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无</div>
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
      title: '图片数',
      dataIndex: 'images',
      width: 80,
      align: 'center',
      render: (images?: string[]) => images?.length || 0,
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
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
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
        className="[&_.ant-card-body]:min-h-[calc(100vh-180px)]"
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={footprints}
          scroll={{ x: 1000 }}
          pagination={{
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
      <Modal title={editingFootprint ? '编辑足迹' : '创建足迹'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} okText="确定" cancelText="取消" width={980}>
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="border border-gray-200 rounded-lg p-4">
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
              <Form.Item label="位置坐标" name="position" rules={[{ pattern: /^-?\d+\.?\d*,-?\d+\.?\d*$/, message: '格式错误，请输入：经度,纬度（例如：120.135,30.259）' }]} extra="格式：经度,纬度（例如：120.135,30.259）" className="mb-0">
                <Input placeholder="请输入位置坐标（可选）" />
              </Form.Item>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <Form.Item
                label="封面"
                name="cover"
                extra={
                  <div className="flex items-center justify-between mt-1">
                    <span>从相册中选择封面图片，未设置时将使用相册第一张</span>
                    <Space size={4}>
                      {coverValue && (
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => {
                            form.setFieldsValue({ cover: undefined });
                            setSelectedCoverUrl(null);
                          }}
                        >
                          清除封面
                        </Button>
                      )}
                      <Button type="link" size="small" onClick={() => handleOpenPhotoSelect('cover')}>
                        选择封面
                      </Button>
                    </Space>
                  </div>
                }
              >
                <div className="min-h-[120px] border border-dashed border-gray-300 rounded p-3">
                  {coverValue ? (
                    <div className="w-32 aspect-square rounded overflow-hidden">
                      <Image src={coverValue} alt="封面" className="w-full h-full object-cover" preview={false} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 text-gray-400">暂无封面，点击「选择封面」从相册中选择</div>
                  )}
                </div>
              </Form.Item>
              <Form.Item
                label="图片"
                name="images"
                extra={
                  <div className="flex items-center justify-between mt-1">
                    <span>从相册中选择图片</span>
                    <Button type="link" size="small" onClick={() => handleOpenPhotoSelect('images')}>
                      选择图片
                    </Button>
                  </div>
                }
                className="mb-0"
              >
                <div className="min-h-[120px] border border-dashed border-gray-300 rounded p-3">
                  {imagesValue && imagesValue.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {imagesValue.map((url: string, index: number) => (
                        <div key={index} className="group relative aspect-square rounded overflow-hidden">
                          <Image src={url} alt={`图片 ${index + 1}`} className="w-full h-full object-cover" preview={false} />
                          <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                          <Button
                            type="text"
                            size="small"
                            shape="circle"
                            icon={<AiOutlineClose />}
                            className="!absolute top-1.5 right-1.5 !w-6 !h-6 !min-w-0 !p-0 !text-white !bg-black/55 hover:!bg-red-500 hover:!text-white !opacity-0 group-hover:!opacity-100 !transition-all"
                            onClick={() => handleRemoveImage(url)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 text-gray-400">暂无图片，点击"选择图片"按钮从相册中选择</div>
                  )}
                </div>
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      {/* 选择照片弹窗 */}
      <Modal
        title={photoSelectMode === 'cover' ? '从相册选择封面' : '从相册选择图片'}
        open={isPhotoSelectModalOpen}
        onOk={handleConfirmPhotoSelect}
        onCancel={() => {
          setIsPhotoSelectModalOpen(false);
          setSelectedPhotoUrls([]);
          setSelectedCoverUrl(null);
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
                if (photoSelectMode === 'images') {
                  setSelectedPhotoUrls([]);
                }
              }}
              style={{ width: 300 }}
              options={albums.map((album) => ({ label: album.name, value: album.id }))}
            />
            <div className="text-gray-600">
              {photoSelectMode === 'cover' ? (selectedCoverUrl ? '已选择 1 张封面' : '未选择封面') : `已选择 ${selectedPhotoUrls.length} 张图片`}
            </div>
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
                      const valueUrl = getPhotoValueUrl(photo);
                      const isSelected = photoSelectMode === 'cover' ? selectedCoverUrl === valueUrl : selectedPhotoUrls.includes(valueUrl);
                      return (
                        <div key={photo.id} className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`} onClick={() => togglePhotoSelection(valueUrl)}>
                          <div className="h-32 rounded-lg overflow-hidden">
                            <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                          </div>
                          {photoSelectMode === 'images' ? (
                            <Checkbox checked={isSelected} className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()} onChange={() => togglePhotoSelection(valueUrl)} />
                          ) : (
                            isSelected && <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">封面</div>
                          )}
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
