import { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Empty, Modal, Checkbox, Input, Space, Pagination } from 'antd';
import { AiOutlineArrowLeft, AiOutlineDelete, AiOutlineSearch, AiOutlineEdit } from 'react-icons/ai';
import { useParams, useNavigate } from 'react-router';
import { getAlbumPhotosAPI, addPhotosToAlbumAPI, removePhotosFromAlbumAPI, getPhotosExcludeFromAlbumAPI } from '@/api/album';
import { updatePhotoAPI, deletePhotoAPI } from '@/api/photo';
import type { Photo } from '@/types/photo';
import { Tooltip } from '@heroui/react';
import UploadPanel from '@/components/Upload';
import { PreviewImage, PreviewImageGroup } from '@/components/PreviewImage';
import { formatFileSize } from '@/utils/formatSize';
import { getThumbImageUrl, getPreviewImageUrl } from '@/utils/image';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editPhotoName, setEditPhotoName] = useState('');
  const [editPhotoDescription, setEditPhotoDescription] = useState('');
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedAlbumPhotoIds, setSelectedAlbumPhotoIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
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

  // 加载待添加照片（排除当前相册已有的）
  const getPhotosExcludeFromAlbum = async (page = availablePhotosPage, limit = availablePhotosLimit) => {
    if (!id) return;
    try {
      setAvailablePhotosLoading(true);
      const { data } = await getPhotosExcludeFromAlbumAPI(Number(id), {
        page,
        limit,
        scene: 'thumb',
        keyword: debouncedKeyword || undefined,
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
  }, [isAddModalOpen, debouncedKeyword, availablePhotosPage, availablePhotosLimit]);

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

  return (
    <div className="space-y-2">
      {/* 照片网格 */}
      <div>
        <Card
          title={<Button icon={<AiOutlineArrowLeft />} onClick={() => navigate('/albums')} />}
          extra={
            <Space size={10}>
              <Button type={isBulkSelectMode ? 'primary' : 'default'} danger={isBulkSelectMode} onClick={toggleBulkSelectMode}>
                {isBulkSelectMode ? '退出批量' : '批量选择'}
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>绑定照片</Button>
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
                                <Button size="small" icon={<AiOutlineEdit />} onClick={() => handleEditPhoto(photo)} className="shadow-lg" />
                                <Button type="primary" danger size="small" icon={<AiOutlineDelete />} onClick={() => handleDeletePhoto(photo)} className="shadow-lg" />
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
        }}
      >
        <div className="flex justify-between items-center mb-4">
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

          <Button type={selectedPhotoIds.length > 0 ? 'primary' : 'default'} onClick={handleAddPhotos}>{`绑定 ${selectedPhotoIds.length} 张照片`}</Button>
        </div>

        {availablePhotosLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : availablePhotos.length === 0 ? (
          <Empty description="没有可添加的照片" />
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
    </div>
  );
};
