import { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Empty, Modal, Checkbox, Input, Space, Pagination, Segmented } from 'antd';
import { AiOutlineArrowLeft, AiOutlineDelete, AiOutlineSearch, AiOutlineEdit, AiOutlineRocket } from 'react-icons/ai';
import { useParams, useNavigate } from 'react-router';
import { getAlbumPhotosAPI, addPhotosToAlbumAPI, removePhotosFromAlbumAPI, getPhotosExcludeFromAlbumAPI } from '@/api/album';
import { updatePhotoAPI, deletePhotoAPI, previewSlimPhotosAPI, slimPhotosAPI } from '@/api/photo';
import type { Photo, SlimPhotoPreview } from '@/types/photo';
import { Tooltip } from '@heroui/react';
import UploadPanel from '@/components/Upload';
import { PreviewImage, PreviewImageGroup } from '@/components/PreviewImage';
import { formatFileSize } from '@/utils/formatSize';
import { getThumbImageUrl, getPreviewImageUrl } from '@/utils/image';

const SLIM_MIN_SIZE_BYTES = 500 * 1024;
const SLIM_MAX_LONG_EDGE = 2560;
const SLIM_QUALITY = 50;

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLimit, setPhotosLimit] = useState(24);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [availablePhotosLoading, setAvailablePhotosLoading] = useState(false);
  const [availablePhotosPage, setAvailablePhotosPage] = useState(1);
  const [availablePhotosLimit, setAvailablePhotosLimit] = useState(12);
  const [availablePhotosTotal, setAvailablePhotosTotal] = useState(0);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [photoFilterMode, setPhotoFilterMode] = useState<'exclude' | 'unbound'>('exclude');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editPhotoName, setEditPhotoName] = useState('');
  const [editPhotoDescription, setEditPhotoDescription] = useState('');
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedAlbumPhotoIds, setSelectedAlbumPhotoIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isSlimModalOpen, setIsSlimModalOpen] = useState(false);
  const [slimPreview, setSlimPreview] = useState<SlimPhotoPreview | null>(null);
  const [slimPreviewLoading, setSlimPreviewLoading] = useState(false);
  const [slimRunning, setSlimRunning] = useState(false);
  const [slimCurrentName, setSlimCurrentName] = useState('');
  const [slimTargetIds, setSlimTargetIds] = useState<number[]>([]);
  const [slimResultText, setSlimResultText] = useState('');
  const [slimSelectedMode, setSlimSelectedMode] = useState(false);
  const isAllAlbumPhotosSelected = photos.length > 0 && selectedAlbumPhotoIds.length === photos.length;

  // 加载相册照片
  const getAlbumPhotos = async (page = photosPage, limit = photosLimit) => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await getAlbumPhotosAPI(Number(id), { page, limit, scene: 'thumb' });
      setPhotos(data.result);
      setPhotosTotal(data.total);
    } catch {
      message.error('加载照片列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载待添加照片（排除当前相册已有的，或仅未绑定任何相册的）
  const getPhotosExcludeFromAlbum = async (page = availablePhotosPage, limit = availablePhotosLimit) => {
    if (!id) return;
    try {
      setAvailablePhotosLoading(true);
      const { data } = await getPhotosExcludeFromAlbumAPI(Number(id), {
        page,
        limit,
        scene: 'thumb',
        keyword: debouncedKeyword || undefined,
        unbound_only: photoFilterMode === 'unbound',
      });
      setAvailablePhotos(data.result);
      setAvailablePhotosTotal(data.total);
    } catch {
      message.error('加载可添加照片失败');
    } finally {
      setAvailablePhotosLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setPhotosPage(1);
      setPhotosLimit(25);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      getAlbumPhotos(photosPage, photosLimit);
    }
  }, [id, photosPage, photosLimit]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchKeyword]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    getPhotosExcludeFromAlbum(availablePhotosPage, availablePhotosLimit);
  }, [isAddModalOpen, debouncedKeyword, availablePhotosPage, availablePhotosLimit, photoFilterMode]);

  useEffect(() => {
    setSelectedAlbumPhotoIds((prev) => prev.filter((id) => photos.some((photo) => photo.id === id)));
  }, [photos]);

  // 绑定照片到相册
  const handleAddPhotos = async () => {
    if (selectedPhotoIds.length === 0) {
      message.warning('请选择要绑定的照片');
      return;
    }
    try {
      await addPhotosToAlbumAPI(Number(id), { photo_ids: selectedPhotoIds });
      message.success(`成功绑定 ${selectedPhotoIds.length} 张照片`);
      setIsAddModalOpen(false);
      setSelectedPhotoIds([]);
      getAlbumPhotos();
    } catch {
      message.error('绑定照片失败');
    }
  };

  // 打开编辑照片弹窗
  const handleEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditPhotoName(photo.name);
    setEditPhotoDescription(photo.description || '');
    setIsEditModalOpen(true);
  };

  const handleSlimPhoto = (photo: Photo, event: React.MouseEvent) => {
    event.stopPropagation();
    openSlimModal([photo.id]);
  };

  // 更新照片名称
  const handleUpdatePhoto = async () => {
    if (!editingPhoto) return;
    if (!editPhotoName.trim()) {
      message.warning('照片名称不能为空');
      return;
    }
    try {
      await updatePhotoAPI(editingPhoto.id, { name: editPhotoName, description: editPhotoDescription });
      message.success('修改照片名称成功');
      setIsEditModalOpen(false);
      setEditingPhoto(null);
      setEditPhotoName('');
      getAlbumPhotos();
    } catch {
      message.error('修改照片名称失败');
    }
  };

  // 删除照片（提供两种删除方式）
  const handleDeletePhoto = (photo: Photo) => {
    Modal.confirm({
      title: '删除照片',
      content: (
        <div className="space-y-2">
          <p className="text-gray-600">
            <b>从相册移除：</b>只从当前相册中移除，照片依然保留在系统中
          </p>
          <p className="text-red-600">
            <b>彻底删除：</b>从系统中完全删除此照片（不可恢复）
          </p>
        </div>
      ),
      okText: '彻底删除',
      cancelText: '取消',
      okType: 'danger',
      maskClosable: true, // 允许点击遮罩层关闭
      onCancel: () => {
        Modal.destroyAll();
      },
      onOk: async () => {
        try {
          await deletePhotoAPI([photo.id]);
          message.success('照片已彻底删除');
          getAlbumPhotos();
        } catch (error: any) {
          console.error(error.message);
        }
      },
      footer: (_, { OkBtn }) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={async () => {
              Modal.destroyAll();
              try {
                await removePhotosFromAlbumAPI(Number(id), { photo_ids: [photo.id] });
                message.success('已从相册中移除');
                getAlbumPhotos();
              } catch {
                message.error('移除失败');
              }
            }}
          >
            从相册移除
          </Button>
          <OkBtn />
        </div>
      ),
    });
  };

  const toggleBulkSelectMode = () => {
    setIsBulkSelectMode((prev) => {
      if (prev) {
        setSelectedAlbumPhotoIds([]);
      }
      return !prev;
    });
  };

  const toggleAlbumPhotoSelection = (photoId: number) => {
    setSelectedAlbumPhotoIds((prev) => (prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]));
  };

  const handleBulkRemovePhotos = async () => {
    if (selectedAlbumPhotoIds.length === 0 || !id) {
      message.warning('请选择要移除的照片');
      return;
    }
    Modal.confirm({
      title: `确认从相册移除 ${selectedAlbumPhotoIds.length} 张照片？`,
      okText: '确认移除',
      cancelText: '取消',
      onOk: async () => {
        setBulkActionLoading(true);
        try {
          await removePhotosFromAlbumAPI(Number(id), { photo_ids: selectedAlbumPhotoIds });
          message.success('已从相册中移除选中照片');
          setSelectedAlbumPhotoIds([]);
          setIsBulkSelectMode(false);
          getAlbumPhotos();
        } catch {
          message.error('移除失败');
        } finally {
          setBulkActionLoading(false);
        }
      },
    });
  };

  const handleToggleSelectAllAlbumPhotos = () => {
    if (isAllAlbumPhotosSelected) {
      setSelectedAlbumPhotoIds([]);
      return;
    }
    setSelectedAlbumPhotoIds(photos.map((photo) => photo.id));
  };

  const handleBulkDeletePhotos = () => {
    if (selectedAlbumPhotoIds.length === 0) {
      message.warning('请选择要删除的照片');
      return;
    }
    Modal.confirm({
      title: `彻底删除 ${selectedAlbumPhotoIds.length} 张照片`,
      content: '删除后不可恢复，请谨慎操作。',
      okText: '彻底删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        setBulkActionLoading(true);
        try {
          await deletePhotoAPI(selectedAlbumPhotoIds);
          message.success('已彻底删除选中照片');
          setSelectedAlbumPhotoIds([]);
          setIsBulkSelectMode(false);
          getAlbumPhotos();
        } catch {
          message.error('删除失败');
        } finally {
          setBulkActionLoading(false);
        }
      },
    });
  };

  const loadSlimPreview = async (photoIds?: number[]) => {
    if (!id && (!photoIds || photoIds.length === 0)) return;

    setSlimPreviewLoading(true);
    setSlimResultText('');
    try {
      const { data } = await previewSlimPhotosAPI({
        ...(photoIds?.length ? { ids: photoIds } : { albumId: Number(id) }),
        minSizeBytes: SLIM_MIN_SIZE_BYTES,
        maxLongEdge: SLIM_MAX_LONG_EDGE,
      });
      setSlimPreview(data);
      setSlimTargetIds(data.photoIds);
    } catch {
      message.error('获取瘦身预览失败');
      setSlimPreview(null);
      setSlimTargetIds([]);
    } finally {
      setSlimPreviewLoading(false);
    }
  };

  const openSlimModal = async (photoIds?: number[]) => {
    setSlimSelectedMode(Boolean(photoIds?.length));
    setIsSlimModalOpen(true);
    setSlimCurrentName('');
    await loadSlimPreview(photoIds);
  };

  const runSlimTask = async () => {
    if (slimTargetIds.length === 0) {
      message.info('没有需要瘦身的照片');
      return;
    }

    setSlimRunning(true);
    setSlimResultText('');

    let success = 0;
    let failed = 0;
    let skipped = 0;
    let savedBytes = 0;

    for (let index = 0; index < slimTargetIds.length; index += 1) {
      const photoId = slimTargetIds[index];
      const previewItem = slimPreview?.items.find((item) => item.id === photoId);
      setSlimCurrentName(previewItem?.name || `照片 #${photoId}`);

      try {
        const { data } = await slimPhotosAPI({
          ids: [photoId],
          minSizeBytes: SLIM_MIN_SIZE_BYTES,
          maxLongEdge: SLIM_MAX_LONG_EDGE,
          quality: SLIM_QUALITY,
        });
        success += data.success;
        failed += data.failed;
        skipped += data.skipped;
        savedBytes += data.results.reduce((sum, item) => sum + (item.savedBytes || 0), 0);
      } catch {
        failed += 1;
      }
    }

    setSlimRunning(false);
    setSlimCurrentName('');
    setSlimResultText(`完成：成功 ${success} 张，跳过 ${skipped} 张，失败 ${failed} 张，共节省 ${formatFileSize(savedBytes)}`);
    message.success('照片瘦身任务已完成');
    setSelectedAlbumPhotoIds([]);
    setIsBulkSelectMode(false);
    getAlbumPhotos();
  };

  const handleBulkSlimPhotos = () => {
    if (selectedAlbumPhotoIds.length === 0) {
      message.warning('请选择要瘦身的照片');
      return;
    }
    openSlimModal(selectedAlbumPhotoIds);
  };

  return (
    <div className="space-y-2">
      {/* 照片网格 */}
      <div>
        <Card
          title={<Button icon={<AiOutlineArrowLeft />} onClick={() => navigate('/albums')} />}
          extra={
            <Space size={10}>
              <Button onClick={() => setIsAddModalOpen(true)}>绑定照片</Button>

              <Button type={isBulkSelectMode ? 'primary' : 'default'} danger={isBulkSelectMode} onClick={toggleBulkSelectMode}>
                {isBulkSelectMode ? '退出批量' : '批量选择'}
              </Button>
              
              <Button type="primary" onClick={() => setIsUploadModalOpen(true)}>
                上传照片
              </Button>
            </Space>
          }
          className="[&_.ant-card-body]:min-h-[calc(100vh-180px)]"
        >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {Array.from({ length: photosLimit }).map((_, index) => (
                <div key={index} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <Empty
              description={
                <span>
                  暂无照片，点击
                  <span className="text-primary cursor-pointer ml-1" onClick={() => setIsAddModalOpen(true)}>
                    绑定照片
                  </span>
                </span>
              }
            />
          ) : (
            <>
              {isBulkSelectMode && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span>
                      已选择 <span className="font-semibold">{selectedAlbumPhotoIds.length}</span> 张照片
                    </span>
                    <Button type="link" size="small" onClick={handleToggleSelectAllAlbumPhotos}>
                      {isAllAlbumPhotosSelected ? '取消全选' : '全选'}
                    </Button>
                  </div>
                  <Space>
                    <Button onClick={handleBulkRemovePhotos} loading={bulkActionLoading} disabled={selectedAlbumPhotoIds.length === 0}>
                      从相册移除
                    </Button>
                    <Button onClick={handleBulkSlimPhotos} loading={slimPreviewLoading || slimRunning} disabled={selectedAlbumPhotoIds.length === 0}>
                      一键瘦身
                    </Button>
                    <Button type="primary" danger onClick={handleBulkDeletePhotos} loading={bulkActionLoading} disabled={selectedAlbumPhotoIds.length === 0}>
                      彻底删除
                    </Button>
                  </Space>
                </div>
              )}

              <PreviewImageGroup>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {photos.map((photo) => {
                  const isSelected = selectedAlbumPhotoIds.includes(photo.id);
                  return (
                    <Tooltip
                      key={photo.id}
                      content={
                        <div className="px-1 py-2">
                          <div className="text-tiny text-default-400 mt-1">
                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片名称：</span>
                              <span className="line-clamp-1 text-gray-600">{photo.name}</span>
                            </div>

                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片尺寸：</span>
                              <span className="text-gray-600">{photo.width && photo.height ? `${photo.width} × ${photo.height}` : '未知'}</span>
                            </div>

                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片大小：</span>
                              <span className="text-gray-600">{formatFileSize(photo.size)}</span>
                            </div>

                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片类型：</span>
                              <span className="text-gray-600">{photo.type ? photo.type.toUpperCase() : '未知'}</span>
                            </div>

                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片时间：</span>
                              <span className="text-gray-600">{new Date(photo.create_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>

                            <div className="flex space-x-2">
                              <span className="flex justify-end w-[70px] text-gray-700 font-bold">图片描述：</span>
                              <span className="line-clamp-1 text-gray-600">{photo.description || '---'}</span>
                            </div>
                          </div>
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
                      <div
                        className={`relative group ${isBulkSelectMode ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (isBulkSelectMode) {
                            toggleAlbumPhotoSelection(photo.id);
                          }
                        }}
                      >
                        <div className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-md transition-all duration-300 ${isBulkSelectMode && isSelected ? 'ring-4 ring-blue-500' : 'hover:shadow-xl'}`}>
                          <PreviewImage
                            src={getThumbImageUrl(photo.url, photo.original_url)}
                            alt={photo.name}
                            loading="lazy"
                            decoding="async"
                            className="!absolute !inset-0 !w-full !h-full !object-cover"
                            wrapperClassName="!absolute !inset-0 !w-full !h-full"
                            preview={isBulkSelectMode ? false : undefined}
                            previewSrc={getPreviewImageUrl(photo.url, photo.original_url)}
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-10" />
                          {!isBulkSelectMode && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-20">
                              <Space>
                                <Button
                                  size="small"
                                  icon={<AiOutlineRocket />}
                                  title="瘦身"
                                  loading={slimRunning && slimTargetIds.includes(photo.id)}
                                  disabled={slimPreviewLoading || slimRunning}
                                  onClick={(event) => handleSlimPhoto(photo, event)}
                                  className="shadow-lg"
                                />
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<AiOutlineEdit />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditPhoto(photo);
                                  }}
                                  className="shadow-lg"
                                />
                                <Button
                                  type="primary"
                                  danger
                                  size="small"
                                  icon={<AiOutlineDelete />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeletePhoto(photo);
                                  }}
                                  className="shadow-lg"
                                />
                              </Space>
                            </div>
                          )}
                          {isBulkSelectMode && (
                            <Checkbox
                              checked={isSelected}
                              className="absolute top-2 right-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAlbumPhotoSelection(photo.id);
                              }}
                            />
                          )}
                          {isBulkSelectMode && isSelected && <div className="absolute inset-0 bg-blue-500/10 z-10" />}
                        </div>
                        <div className={`mt-2 text-sm text-gray-700 truncate px-1 font-medium ${isSelected && '!text-primary'}`}>{photo.name}</div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
              </PreviewImageGroup>

              {photosTotal > photosLimit && (
                <div className="mt-6 flex justify-center">
                  <Pagination
                    current={photosPage}
                    pageSize={photosLimit}
                    total={photosTotal}
                    showSizeChanger
                    showTotal={(total) => `共 ${total} 张照片`}
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
        </Card>
      </div>

      {/* 绑定照片弹窗 */}
      <Modal
        title="绑定照片到相册"
        open={isAddModalOpen}
        width={900}
        footer={null}
        maskClosable
        onCancel={() => {
          setIsAddModalOpen(false);
          setSelectedPhotoIds([]);
          setSearchKeyword('');
          setPhotoFilterMode('exclude');
        }}
      >
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="搜索照片名称"
              prefix={<AiOutlineSearch />}
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setAvailablePhotosPage(1);
              }}
              allowClear
              className="!w-[300px]"
            />

            <Segmented
              value={photoFilterMode}
              options={[
                { label: '未加入本相册', value: 'exclude' },
                { label: '未绑定相册', value: 'unbound' },
              ]}
              onChange={(value) => {
                setPhotoFilterMode(value as 'exclude' | 'unbound');
                setAvailablePhotosPage(1);
                setSelectedPhotoIds([]);
              }}
            />
          </div>

          <Button type={selectedPhotoIds.length > 0 ? 'primary' : 'default'} onClick={handleAddPhotos}>{`绑定 ${selectedPhotoIds.length} 张照片`}</Button>
        </div>

        {availablePhotosLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : availablePhotos.length === 0 ? (
          <Empty description={photoFilterMode === 'unbound' ? '没有未绑定任何相册的照片' : '没有可添加的照片'} />
        ) : (
          <>
            <div className="pr-2">
              <div className="grid grid-cols-4 gap-4">
                {availablePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative cursor-pointer transition-all`}
                    onClick={() => {
                      setSelectedPhotoIds((prev) => (prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]));
                    }}
                  >
                    <div className="h-32 rounded-lg overflow-hidden">
                      <img src={getThumbImageUrl(photo.url, photo.original_url)} alt={photo.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>

                    <Checkbox
                      checked={selectedPhotoIds.includes(photo.id)}
                      className="absolute top-2 right-2"
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        setSelectedPhotoIds((prev) => (prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]));
                      }}
                    />
                    <div className={`p-2 bg-white text-xs truncate ${selectedPhotoIds.includes(photo.id) ? 'text-primary' : 'text-gray-700'}`}>{photo.name}</div>
                  </div>
                ))}
              </div>
            </div>
            {availablePhotosTotal > availablePhotosLimit && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={availablePhotosPage}
                  pageSize={availablePhotosLimit}
                  total={availablePhotosTotal}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 张`}
                  pageSizeOptions={['12', '24', '56', '100']}
                  onChange={(page, pageSize) => {
                    setAvailablePhotosPage(page);
                    setAvailablePhotosLimit(pageSize);
                  }}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 编辑照片弹窗 */}
      <Modal
        title="编辑照片"
        open={isEditModalOpen}
        onOk={handleUpdatePhoto}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingPhoto(null);
          setEditPhotoName('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">照片名称</label>
            <Input placeholder="请输入照片名称" value={editPhotoName} onChange={(e) => setEditPhotoName(e.target.value)} onPressEnter={handleUpdatePhoto} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">照片描述</label>
            <Input.TextArea placeholder="请输入照片描述" value={editPhotoDescription} onChange={(e) => setEditPhotoDescription(e.target.value)} onPressEnter={handleUpdatePhoto} autoSize={{ minRows: 2, maxRows: 6 }} />
          </div>
        </div>
      </Modal>

      {/* 上传照片弹窗 */}
      <Modal title="上传照片" open={isUploadModalOpen} onCancel={() => setIsUploadModalOpen(false)} footer={null} width={600}>
        <UploadPanel
          albumId={id ? Number(id) : null}
          onUploaded={() => {
            setIsUploadModalOpen(false);
            getAlbumPhotos();
          }}
        />
      </Modal>

      {/* 一键瘦身弹窗 */}
      <Modal
        title="一键瘦身"
        open={isSlimModalOpen}
        onCancel={() => {
          if (slimRunning) return;
          setIsSlimModalOpen(false);
          setSlimPreview(null);
          setSlimResultText('');
        }}
        onOk={runSlimTask}
        okText={slimRunning ? '处理中...' : '开始瘦身'}
        cancelText="关闭"
        confirmLoading={slimRunning}
        okButtonProps={{ disabled: slimPreviewLoading || !slimPreview?.count || slimRunning }}
      >
        {slimPreviewLoading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              将通过七牛云持久化处理压缩 Bucket 中的原图（长边不超过 {SLIM_MAX_LONG_EDGE}px，JPEG 质量 {SLIM_QUALITY}），无需删除重传。
            </p>

            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 space-y-1">
              <div>待处理：{slimPreview?.count ?? 0} 张</div>
              <div>总体积：{formatFileSize(slimPreview?.totalSize ?? 0)}</div>
              <div>
                {slimSelectedMode
                  ? '将对选中的照片执行压缩（GIF 自动跳过）'
                  : `触发条件：单张大于 ${formatFileSize(SLIM_MIN_SIZE_BYTES)}（GIF 自动跳过）`}
              </div>
              {slimSelectedMode && slimPreview?.count === 0 && (
                <div className="text-amber-600">选中的照片均为 GIF 或不支持处理的格式</div>
              )}
            </div>
            {slimRunning && (
              <div className="flex flex-col items-center gap-2 py-4">
                <Spin />
                {slimCurrentName && <div className="text-xs text-gray-500 truncate">正在处理：{slimCurrentName}</div>}
              </div>
            )}
            {slimResultText && <div className="text-sm text-green-600">{slimResultText}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
};
