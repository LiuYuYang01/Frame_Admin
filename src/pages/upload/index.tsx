import { useState, useEffect } from 'react';
import { Upload, message, Select, Button, Card, Empty, Spin, Tooltip } from 'antd';
import {
  FiUploadCloud,
  FiTrash2,
  FiArrowUpRight,
  FiX,
  FiCheck,
  FiLoader,
} from 'react-icons/fi';
import type { UploadProps, UploadFile } from 'antd';
import { getAlbumListAPI } from '@/api/album';
import type { Album } from '@/types/album';
import { useNavigate } from 'react-router';
import { formatFileSize } from '@/utils/formatSize';
import { getPreviewImageUrl, getThumbImageUrl } from '@/utils/image';
import type { FileUploadTask } from '@/types/upload';
import { useImageUpload } from '@/hooks/useImageUpload';
import { IMAGE_QUALITY_SELECT_OPTIONS } from '@/constants/upload';
import { PreviewImage, PreviewImageGroup } from '@/components/PreviewImage';

const { Dragger } = Upload;

interface UploadedPhoto {
  id: number;
  name: string;
  url: string;
  size: number;
}

const taskStatusMeta: Record<
  FileUploadTask['status'],
  { label: string; className: string }
> = {
  pending: { label: '等待中', className: 'text-ink-faint' },
  checking: { label: '秒传校验', className: 'text-brand' },
  uploading: { label: '传输中', className: 'text-brand' },
  completed: { label: '已完成', className: 'text-ok' },
  error: { label: '失败', className: 'text-danger' },
  cancelled: { label: '已取消', className: 'text-ink-faint' },
};

/** 本地预览缩略图，卸载时回收 objectURL */
function FileThumb({ file }: { file: UploadFile }) {
  const [url] = useState(() =>
    file.originFileObj ? URL.createObjectURL(file.originFileObj) : '',
  );
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!url) return <div className="size-9 shrink-0 rounded-md bg-rail" />;
  return (
    <img
      src={url}
      alt=""
      className="size-9 shrink-0 rounded-md border border-line object-cover"
    />
  );
}

export default () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);

  const {
    quality,
    setQuality,
    fileList,
    setFileList,
    uploading,
    uploadProgress,
    uploadTasks,
    handleUpload,
    cancelUpload,
  } = useImageUpload({
    onUploaded: (photos) => setUploadedPhotos(photos),
  });

  const totalSelectedSize = fileList.reduce((acc, file) => acc + (file.size || 0), 0);
  const tasks = Array.from(uploadTasks.values());
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const loadAlbums = async () => {
    try {
      const { data } = await getAlbumListAPI({ page: 1, limit: 100 });
      setAlbums(data.result);
      if (data.result.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(data.result[0].id);
      }
    } catch {
      message.error('加载相册列表失败');
    } finally {
      setAlbumsLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.filter((file) => file.status !== 'error');
    setFileList(newFileList);
  };

  const handleRemove = (file: UploadFile) => {
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  const startUpload = async () => {
    if (!selectedAlbumId) {
      message.error('请选择目标相册');
      return;
    }
    await handleUpload(selectedAlbumId);
  };

  const handleClearUploaded = () => {
    setUploadedPhotos([]);
  };

  return (
    <div>
      <Card
        title={<span className="text-xl font-semibold">上传图片</span>}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              placeholder="选择目标相册"
              value={selectedAlbumId}
              onChange={setSelectedAlbumId}
              disabled={uploading || albumsLoading}
              showSearch
              optionFilterProp="label"
              className="w-44"
              optionLabelProp="label"
              options={albums.map((album) => ({
                label: album.name,
                value: album.id,
                count: album.photo_count || 0,
              }))}
              optionRender={(option) => (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{option.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                    {option.data?.count ?? 0} 张
                  </span>
                </div>
              )}
            />
            <Tooltip title="自适应按图片体积与分辨率自动选档，其余档位按固定质量压缩">
              <Select
                value={quality}
                onChange={setQuality}
                disabled={uploading}
                className="w-36"
                options={IMAGE_QUALITY_SELECT_OPTIONS}
              />
            </Tooltip>
            <Button
              type="primary"
              className="cursor-pointer"
              icon={<FiUploadCloud className="size-4" />}
              loading={uploading}
              disabled={!selectedAlbumId || fileList.length === 0}
              onClick={startUpload}
            >
              开始上传
            </Button>
          </div>
        }
        className="[&_.ant-card-body]:p-0! [&_.ant-card-head-wrapper]:flex-wrap! [&_.ant-card-head-wrapper]:gap-2!"
      >
        {albumsLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spin />
          </div>
        ) : albums.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有可用的相册，上传前请先创建"
            />
            <Button
              type="primary"
              className="cursor-pointer"
              icon={<FiArrowUpRight className="size-4" />}
              onClick={() => navigate('/albums')}
            >
              去创建相册
            </Button>
          </div>
        ) : (
          <>
            {/* 投放条 */}
            <Dragger
              multiple
              fileList={fileList}
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              onRemove={handleRemove}
              disabled={!selectedAlbumId || uploading}
              accept="image/*"
              className="[&_.ant-upload-drag]:rounded-none! [&_.ant-upload-drag]:border-none! [&_.ant-upload-drag]:bg-rail! [&_.ant-upload-drag.ant-upload-drag-hover]:bg-info-soft! [&_.ant-upload-btn]:p-0!"
            >
              {fileList.length === 0 && uploadTasks.size === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 sm:py-20">
                  <FiUploadCloud className="size-10 text-brand" />
                  <p className="text-sm text-ink">
                    拖拽图片到此处，或 <span className="text-brand">点击选择</span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    支持多选 · JPG / PNG / GIF / WEBP · 相同文件自动秒传
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4 text-left">
                  <FiUploadCloud className="size-5 shrink-0 text-brand" />
                  <p className="min-w-0 truncate text-sm text-ink">
                    拖拽图片到此处，或 <span className="text-brand">点击选择</span> 继续添加
                  </p>
                  <span className="ml-auto hidden shrink-0 text-xs text-ink-faint sm:block">
                    支持多选 · 相同文件自动秒传
                  </span>
                </div>
              )}
            </Dragger>

            {/* 待上传队列 */}
            {fileList.length > 0 && uploadTasks.size === 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-xs text-ink-muted">
                    待上传{' '}
                    <span className="font-medium tabular-nums text-ink">{fileList.length}</span> 项
                    · 共 {formatFileSize(totalSelectedSize)}
                  </p>
                  {uploading ? (
                    <span className="text-xs tabular-nums text-brand">
                      处理中 {uploadProgress}%
                    </span>
                  ) : (
                    <Button
                      type="text"
                      size="small"
                      className="cursor-pointer"
                      icon={<FiTrash2 className="size-3.5" />}
                      onClick={() => setFileList([])}
                    >
                      清空
                    </Button>
                  )}
                </div>
                <ul className="max-h-72 overflow-y-auto border-t border-line">
                  {fileList.map((file) => (
                    <li
                      key={file.uid}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-row-hover"
                    >
                      <FileThumb file={file} />
                      <span
                        className="min-w-0 flex-1 truncate text-sm text-ink"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                        {formatFileSize(file.size || 0)}
                      </span>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => handleRemove(file)}
                        className="cursor-pointer rounded p-1 text-ink-faint hover:bg-canvas-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FiX className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 传输队列 */}
            {uploadTasks.size > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-xs text-ink-muted">
                    传输队列 · 已完成{' '}
                    <span className="font-medium tabular-nums text-ink">{completedCount}</span> /{' '}
                    {uploadTasks.size}
                  </p>
                  <span className="text-xs tabular-nums text-ink-faint">
                    {uploading ? `处理中 ${uploadProgress}%` : '已结束'}
                  </span>
                </div>
                <ul className="max-h-72 overflow-y-auto border-t border-line">
                  {tasks.map((task) => {
                    const meta = taskStatusMeta[task.status];
                    return (
                      <li key={task.uploadId} className="px-4 py-2.5 hover:bg-row-hover">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <span
                              className="block truncate text-sm text-ink"
                              title={task.file.name}
                            >
                              {task.file.name}
                            </span>
                            <span className="text-xs tabular-nums text-ink-faint">
                              {formatFileSize(task.file.size)}
                            </span>
                          </div>
                          <span
                            className={`inline-flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs ${meta.className}`}
                          >
                            {task.status === 'checking' && (
                              <FiLoader className="size-3 animate-spin" />
                            )}
                            {meta.label}
                            {task.status === 'uploading' && ` ${task.progress}%`}
                          </span>
                          {task.status === 'uploading' ? (
                            <button
                              type="button"
                              onClick={() => cancelUpload(task.uploadId)}
                              className="cursor-pointer shrink-0 rounded p-1 text-ink-faint hover:bg-canvas-deep hover:text-danger"
                            >
                              <FiX className="size-3.5" />
                            </button>
                          ) : task.status === 'completed' ? (
                            <FiCheck className="size-4 shrink-0 text-ok" />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canvas-deep">
                          <div
                            className={`h-full rounded-full ${
                              task.status === 'error'
                                ? 'bg-danger'
                                : task.status === 'cancelled'
                                  ? 'bg-transparent'
                                  : 'bg-brand'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        {task.status === 'error' && task.error && (
                          <p className="mt-1 truncate text-xs text-danger" title={task.error}>
                            {task.error}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* 上传结果 */}
            {uploadedPhotos.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    <FiCheck className="size-3.5 text-ok" />
                    已上传{' '}
                    <span className="font-medium tabular-nums text-ink">
                      {uploadedPhotos.length}
                    </span>{' '}
                    张，可继续添加
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="text"
                      size="small"
                      className="cursor-pointer"
                      icon={<FiArrowUpRight className="size-3.5" />}
                      onClick={() => navigate(`/albums/${selectedAlbumId}`)}
                    >
                      查看相册
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      className="cursor-pointer"
                      icon={<FiTrash2 className="size-3.5" />}
                      onClick={handleClearUploaded}
                    >
                      清空
                    </Button>
                  </div>
                </div>
                <PreviewImageGroup>
                  <div className="grid grid-cols-3 gap-2 border-t border-line px-4 pb-4 pt-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                    {uploadedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square overflow-hidden rounded-md border border-line bg-rail"
                        title={photo.name}
                      >
                        <PreviewImage
                          src={getThumbImageUrl(photo.url)}
                          alt={photo.name}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                          wrapperClassName="size-full"
                          previewSrc={getPreviewImageUrl(photo.url)}
                        />
                      </div>
                    ))}
                  </div>
                </PreviewImageGroup>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
