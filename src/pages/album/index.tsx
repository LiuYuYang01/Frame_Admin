import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Dropdown, Checkbox, Pagination, Space } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineEllipsis, AiOutlineSearch } from 'react-icons/ai';
import { useNavigate } from 'react-router';
import { Tooltip } from '@heroui/react';
import { getAlbumListAPI, createAlbumAPI, updateAlbumAPI, deleteAlbumAPI } from '@/api/album';
import { getUnboundPhotosAPI, deletePhotoAPI } from '@/api/photo';
import type { Album, CreateAlbumParams, UpdateAlbumParams } from '@/types/album';
import type { Photo } from '@/types/photo';
import type { MenuProps } from 'antd';
import FileSvg from '@/assets/svg/file.svg';
import { getCoverImageUrl, getThumbImageUrl } from '@/utils/image';
const { TextArea } = Input;

export default () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [unboundPhotos, setUnboundPhotos] = useState<Photo[]>([]);
  const [unboundPhotosLoading, setUnboundPhotosLoading] = useState(false);
  const [unboundPhotosPage, setUnboundPhotosPage] = useState(1);
  const [unboundPhotosLimit, setUnboundPhotosLimit] = useState(12);
  const [unboundPhotosTotal, setUnboundPhotosTotal] = useState(0);
  const [selectedUnboundPhotoIds, setSelectedUnboundPhotoIds] = useState<number[]>([]);
  const [cleanupSearchKeyword, setCleanupSearchKeyword] = useState('');
  const [debouncedCleanupKeyword, setDebouncedCleanupKeyword] = useState('');
  const [cleanupActionLoading, setCleanupActionLoading] = useState(false);

  const isAllUnboundPhotosSelected =
    unboundPhotos.length > 0 && unboundPhotos.every((photo) => selectedUnboundPhotoIds.includes(photo.id));

  // 加载相册列表
  const loadAlbums = async () => {
    try {
      setLoading(true);
      const { data } = await getAlbumListAPI({ limit: 9999, scene: 'cover' });
      setAlbums(data.result);
    } catch {
      message.error('加载相册列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUnboundPhotos = async (page = unboundPhotosPage, limit = unboundPhotosLimit) => {
    try {
      setUnboundPhotosLoading(true);
      const { data } = await getUnboundPhotosAPI({
        page,
        limit,
        scene: 'thumb',
        keyword: debouncedCleanupKeyword || undefined,
      });
      setUnboundPhotos(data.result);
      setUnboundPhotosTotal(data.total);
    } catch {
      // 忽略
    } finally {
      setUnboundPhotosLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCleanupKeyword(cleanupSearchKeyword.trim());
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [cleanupSearchKeyword]);

  useEffect(() => {
    if (!isCleanupModalOpen) return;
    loadUnboundPhotos(unboundPhotosPage, unboundPhotosLimit);
  }, [isCleanupModalOpen, debouncedCleanupKeyword, unboundPhotosPage, unboundPhotosLimit]);

  const openCleanupModal = () => {
    setSelectedUnboundPhotoIds([]);
    setCleanupSearchKeyword('');
    setDebouncedCleanupKeyword('');
    setUnboundPhotosPage(1);
    setIsCleanupModalOpen(true);
  };

  const handleToggleSelectAllUnboundPhotos = () => {
    if (isAllUnboundPhotosSelected) {
      setSelectedUnboundPhotoIds([]);
      return;
    }
    setSelectedUnboundPhotoIds(unboundPhotos.map((photo) => photo.id));
  };

  const handleDeleteUnboundPhotos = () => {
    if (selectedUnboundPhotoIds.length === 0) {
      message.warning('请选择要删除的照片');
      return;
    }

    Modal.confirm({
      title: `彻底删除 ${selectedUnboundPhotoIds.length} 张未绑定照片`,
      content: '这些照片未关联任何相册，删除后不可恢复，请谨慎操作。',
      okText: '彻底删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        setCleanupActionLoading(true);
        try {
          await deletePhotoAPI(selectedUnboundPhotoIds);
          message.success('未绑定照片已删除');
          setSelectedUnboundPhotoIds([]);
          await loadUnboundPhotos();
        } catch {
          // 忽略
        } finally {
          setCleanupActionLoading(false);
        }
      },
    });
  };

  // 打开创建/编辑弹窗
  const handleOpenModal = (album?: Album) => {
    if (album) {
      setEditingAlbum(album);
      form.setFieldsValue({
        name: album.name,
        description: album.description,
        cover: album.cover,
      });
    } else {
      setEditingAlbum(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAlbum) {
        // 编辑
        await updateAlbumAPI(editingAlbum.id, values as UpdateAlbumParams);
        message.success('更新相册成功');
      } else {
        // 创建
        await createAlbumAPI(values as CreateAlbumParams);
        message.success('创建相册成功');
      }
      setIsModalOpen(false);
      loadAlbums();
    } catch {
      message.error(editingAlbum ? '更新相册失败' : '创建相册失败');
    }
  };

  // 删除相册
  const handleDelete = async (id: number) => {
    try {
      await deleteAlbumAPI(id);
      message.success('删除相册成功');
      loadAlbums();
    } catch {
      // 错误信息由 request 拦截器统一提示
    }
  };

  const handleDeleteAlbumClick = (album: Album) => {
    const photoCount = album.photo_count ?? 0;
    if (photoCount > 0) {
      message.warning(`该相册内仍有 ${photoCount} 张绑定的照片，请先解除绑定后再删除`);
      return;
    }

    Modal.confirm({
      title: '确定删除此相册吗？',
      content: '删除后将无法恢复',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => handleDelete(album.id),
    });
  };

  // 查看相册详情
  const handleViewAlbum = (id: number) => {
    navigate(`/albums/${id}`);
  };

  // 获取操作菜单项
  const getMenuItems = (album: Album): MenuProps['items'] => [
    {
      key: 'edit',
      label: <span className="text-[15px]">编辑</span>,
      icon: <AiOutlineEdit className="!text-xl" />,
      onClick: (e) => {
        e?.domEvent?.stopPropagation();
        handleOpenModal(album);
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
        handleDeleteAlbumClick(album);
      },
    },
  ];

  return (
    <div>
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">相册管理</span>
          </div>
        }
        extra={
          <Space>
            <Button onClick={openCleanupModal}>清理未绑定</Button>
            <Button type="primary" onClick={() => handleOpenModal()}>
              创建相册
            </Button>
          </Space>
        }
        className="[&_.ant-card-body]:min-h-[calc(100vh-180px)]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spin size="large" tip="加载中..." />
          </div>
        ) : albums.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                暂无相册，点击
                <Button type="link" onClick={() => handleOpenModal()}>
                  创建相册
                </Button>
              </span>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {/* 全部相册 */}
              <Tooltip
                content={
                  <div className="px-1 py-2">
                    <div className="text-small font-semibold">全部</div>
                    <div className="text-tiny text-default-400 mt-1">查看所有照片</div>
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
                <div className="relative group cursor-pointer" onClick={() => handleViewAlbum(0)}>
                  <div className="bg-panel rounded-xl !p-0.5 md:p-5 transition-all hover:-translate-y-1 overflow-hidden">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="w-full aspect-square flex items-center justify-center">
                        <img src={FileSvg} alt="" />
                      </div>
                      <div className="flex justify-between items-center w-full pb-2">
                        <div className="text-center w-full flex flex-col justify-center">
                          <div className="text-ink truncate px-1 !text-sm md:text-base group-hover:text-brand transition-colors" title="全部">
                            全部
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              {albums.map((album) => (
                <Tooltip
                  key={album.id}
                  content={
                    album.description ? (
                      <div className="px-1 py-2 max-w-xs">
                        <div className="text-small font-semibold mb-2">{album.name}</div>
                        <div className="text-tiny leading-relaxed mb-2">{album.description}</div>
                        <div className="text-tiny text-default-400 pt-2 border-t border-default-200">创建于 {new Date(album.create_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    ) : (
                      <div className="px-1 py-2">
                        <div className="text-small font-semibold">{album.name}</div>
                        <div className="text-tiny text-default-400 mt-1">创建于 {new Date(album.create_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    )
                  }
                  placement="top"
                  delay={300}
                  closeDelay={0}
                  classNames={{
                    base: 'max-w-md',
                    content: 'bg-content1 border border-default-200 shadow-xl',
                  }}
                >
                  <div className="relative group cursor-pointer" onClick={() => handleViewAlbum(album.id)}>
                    <div className="bg-panel rounded-xl !p-0.5 md:p-5 transition-all hover:-translate-y-1 overflow-hidden">
                      {/* 封面区域 */}
                      <div className="flex flex-col items-center gap-2 justify-center">
                        {album.cover ? (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                            <img
                              src={getCoverImageUrl(album.cover)}
                              alt={album.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-square flex items-center justify-center">
                            <img src={FileSvg} alt="" />
                          </div>
                        )}

                        {/* 相册名称和信息 */}
                        <div className="flex justify-between items-center w-full pb-2">
                          <div className="text-center w-full flex flex-col justify-center">
                            <div className="text-ink truncate px-1 !text-sm md:text-base group-hover:text-brand transition-colors" title={album.name}>
                              {album.name}
                            </div>

                            {album.cover && <div className="absolute bottom-[45px] right-2.5 backdrop-blur-xs shadow rounded-full px-2 py-1 text-xs text-white font-bold">{album.photo_count || 0}</div>}
                          </div>

                          {/* 操作按钮 */}
                          <div className="absolute bottom-[7px] right-2 border transition-all rounded-md hidden group-hover:block">
                            <Dropdown menu={{ items: getMenuItems(album) }} trigger={['click']}>
                              <Button type="text" size="small" icon={<AiOutlineEllipsis />} className="bg-panel/90 backdrop-blur-sm shadow-lg hover:shadow-xl border-0" onClick={(e) => e.stopPropagation()} />
                            </Dropdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* 清理未绑定照片弹窗 */}
      <Modal
        title="清理未绑定照片"
        open={isCleanupModalOpen}
        width={900}
        footer={null}
        maskClosable
        onCancel={() => {
          setIsCleanupModalOpen(false);
          setSelectedUnboundPhotoIds([]);
          setCleanupSearchKeyword('');
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            placeholder="搜索照片名称"
            prefix={<AiOutlineSearch />}
            value={cleanupSearchKeyword}
            onChange={(e) => {
              setCleanupSearchKeyword(e.target.value);
              setUnboundPhotosPage(1);
            }}
            allowClear
            className="!w-[300px]"
          />

          <Space wrap>
            <span className="text-sm text-ink-muted">
              共 {unboundPhotosTotal} 张，已选 {selectedUnboundPhotoIds.length} 张
            </span>
            <Button type="link" size="small" onClick={handleToggleSelectAllUnboundPhotos}>
              {isAllUnboundPhotosSelected ? '取消全选' : '全选当前页'}
            </Button>
            <Button
              type="primary"
              danger
              disabled={selectedUnboundPhotoIds.length === 0}
              loading={cleanupActionLoading}
              onClick={handleDeleteUnboundPhotos}
            >
              删除所选
            </Button>
          </Space>
        </div>

        {unboundPhotosLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : unboundPhotos.length === 0 ? (
          <Empty description="没有未绑定任何相册的照片" />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              {unboundPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative cursor-pointer"
                  onClick={() => {
                    setSelectedUnboundPhotoIds((prev) =>
                      prev.includes(photo.id) ? prev.filter((item) => item !== photo.id) : [...prev, photo.id],
                    );
                  }}
                >
                  <div className="h-32 overflow-hidden rounded-lg">
                    <img
                      src={getThumbImageUrl(photo.url, photo.original_url)}
                      alt={photo.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Checkbox
                    checked={selectedUnboundPhotoIds.includes(photo.id)}
                    className="absolute top-2 right-2"
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => {
                      setSelectedUnboundPhotoIds((prev) =>
                        prev.includes(photo.id) ? prev.filter((item) => item !== photo.id) : [...prev, photo.id],
                      );
                    }}
                  />
                  <div className={`truncate bg-panel p-2 text-xs ${selectedUnboundPhotoIds.includes(photo.id) ? 'text-primary' : 'text-ink-muted'}`}>
                    {photo.name}
                  </div>
                </div>
              ))}
            </div>
            {unboundPhotosTotal > unboundPhotosLimit && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={unboundPhotosPage}
                  pageSize={unboundPhotosLimit}
                  total={unboundPhotosTotal}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 张`}
                  pageSizeOptions={['12', '24', '56', '100']}
                  onChange={(page, pageSize) => {
                    setUnboundPhotosPage(page);
                    setUnboundPhotosLimit(pageSize);
                  }}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 创建/编辑弹窗 */}
      <Modal title={editingAlbum ? '编辑相册' : '创建相册'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} okText="确定" cancelText="取消" width={600}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="相册名称"
            name="name"
            rules={[
              { required: true, message: '请输入相册名称' },
              { max: 50, message: '相册名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入相册名称" />
          </Form.Item>
          <Form.Item label="相册描述" name="description" rules={[{ max: 200, message: '相册描述不能超过200个字符' }]}>
            <TextArea rows={4} placeholder="请输入相册描述（可选）" />
          </Form.Item>
          <Form.Item
            label="封面图片URL"
            name="cover"
            rules={[
              { type: 'url', message: '请输入有效的URL地址' },
              { max: 500, message: 'URL不能超过500个字符' },
            ]}
          >
            <Input placeholder="请输入封面图片URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
