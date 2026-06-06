import { useState, useEffect, useRef } from 'react';
import { Upload, message, Select, Button, Image } from 'antd';
import {
  FiUploadCloud,
  FiFolder,
  FiSliders,
  FiTrash2,
  FiArrowUpRight,
  FiX,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiImage,
  FiHardDrive,
} from 'react-icons/fi';
import { HiOutlinePhotograph } from 'react-icons/hi';
import type { UploadProps, UploadFile } from 'antd';
import { uploadFileAPI, chunkUploadAPI, getUploadProgressAPI, cancelUploadAPI } from '@/api/upload';
import { getAlbumListAPI } from '@/api/album';
import type { Album } from '@/types/album';
import { useNavigate } from 'react-router';
import { calculateFileHash } from '@/utils/hash';
import { formatFileSize } from '@/utils/formatSize';
import type { FileUploadTask } from '@/types/upload';
import { compressImage } from '@/utils/compressImage';

const { Dragger } = Upload;

interface UploadedPhoto {
  id: number;
  name: string;
  url: string;
  size: number;
}

const qualityOptions = [
  { label: '原图', value: 100, hint: '100' },
  { label: '高清', value: 90, hint: '90' },
  { label: '均衡', value: 80, hint: '80' },
  { label: '压缩', value: 70, hint: '70' },
  { label: '极致', value: 60, hint: '60' },
];

const steps = [
  { key: 'album', label: '选定相册', icon: FiFolder },
  { key: 'files', label: '添加文件', icon: FiImage },
  { key: 'upload', label: '开始传输', icon: FiUploadCloud },
];

const taskStatusMeta: Record<
  FileUploadTask['status'],
  { label: string; tone: string; dot: string }
> = {
  pending: { label: '等待中', tone: 'text-gray-400', dot: 'bg-gray-300 dark:bg-strokedark' },
  checking: { label: '校验中', tone: 'text-primary', dot: 'bg-primary/60' },
  uploading: { label: '传输中', tone: 'text-primary', dot: 'bg-primary' },
  completed: { label: '已完成', tone: 'text-primary', dot: 'bg-primary' },
  error: { label: '失败', tone: 'text-red-500', dot: 'bg-red-400' },
  cancelled: { label: '已取消', tone: 'text-gray-400', dot: 'bg-gray-300 dark:bg-strokedark' },
};

export default () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [quality, setQuality] = useState<number>(80);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadTasks, setUploadTasks] = useState<Map<string, FileUploadTask>>(new Map());
  const uploadTasksRef = useRef<Map<string, FileUploadTask>>(new Map());
  const cancelTokensRef = useRef<Map<string, AbortController>>(new Map());
  const dragCounterRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const CHUNK_SIZE = 4 * 1024 * 1024;
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);
  const totalSelectedSize = fileList.reduce((acc, file) => acc + (file.size || 0), 0);
  const activeStep = fileList.length > 0 ? 2 : selectedAlbumId ? 1 : 0;
  const dropZoneEnabled = !!selectedAlbumId && !uploading;

  const resetDragOver = () => {
    dragCounterRef.current = 0;
    setIsDragOver(false);
  };

  const handleDropZoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneEnabled) return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDropZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneEnabled) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      resetDragOver();
    }
  };

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const reset = () => resetDragOver();
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, []);

  useEffect(() => {
    if (uploading) resetDragOver();
  }, [uploading]);

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

  useEffect(() => {
    loadAlbums();
  }, []);

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;
    }
    const isLt30M = file.size / 1024 / 1024 < 30;
    if (!isLt30M) {
      message.error('图片大小不能超过 30MB！');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.filter((file) => file.status !== 'error');
    setFileList(newFileList);
    resetDragOver();
  };

  const handleRemove = (file: UploadFile) => {
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
  };

  const updateUploadTask = (uploadId: string, updates: Partial<FileUploadTask>) => {
    const task = uploadTasksRef.current.get(uploadId);
    if (task) {
      const updatedTask = { ...task, ...updates };
      uploadTasksRef.current.set(uploadId, updatedTask);
      setUploadTasks(new Map(uploadTasksRef.current));
    }
  };

  const calculateOverallProgress = () => {
    const tasks = Array.from(uploadTasksRef.current.values());
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.floor(totalProgress / tasks.length);
  };

  const uploadFileByChunks = async (file: File, uploadId: string, hash?: string, albumId?: number): Promise<void> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const abortController = new AbortController();
    cancelTokensRef.current.set(uploadId, abortController);

    try {
      const progressResult = await getUploadProgressAPI(uploadId);
      const uploadedChunks = progressResult.data.uploadedChunks || [];
      updateUploadTask(uploadId, {
        uploadedChunks,
        status: 'uploading',
      });

      for (let i = 0; i < totalChunks; i++) {
        if (abortController.signal.aborted) {
          updateUploadTask(uploadId, { status: 'cancelled' });
          throw new Error('上传已取消');
        }

        if (uploadedChunks.includes(i)) {
          continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const result = await chunkUploadAPI({
          chunk,
          uploadId,
          chunkIndex: i,
          totalChunks,
          fileSize: file.size,
          fileName: file.name,
          hash,
          albumId,
        });

        const newUploadedChunks = result.data.uploaded;
        updateUploadTask(uploadId, {
          uploadedChunks: newUploadedChunks,
          progress: Math.floor((newUploadedChunks.length / totalChunks) * 100),
        });
        setUploadProgress(calculateOverallProgress());

        if (result.data.completed && 'photo' in result.data) {
          updateUploadTask(uploadId, {
            status: 'completed',
            progress: 100,
            result: result.data.photo,
          });
          setUploadProgress(calculateOverallProgress());
          return;
        }
      }
    } catch (error: any) {
      if (error.message === '上传已取消') {
        return;
      }
      updateUploadTask(uploadId, {
        status: 'error',
        error: error.message || '上传失败',
      });
      throw error;
    } finally {
      cancelTokensRef.current.delete(uploadId);
    }
  };

  const uploadFileNormal = async (file: File, albumId: number): Promise<any> => {
    const result = await uploadFileAPI({
      files: [file],
      albumId,
    });
    return result.data[0];
  };

  const uploadSingleFile = async (file: File, albumId: number): Promise<any> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: FileUploadTask = {
      file,
      uploadId,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      uploadedChunks: [],
      status: 'checking',
      progress: 0,
    };
    uploadTasksRef.current.set(uploadId, task);
    setUploadTasks(new Map(uploadTasksRef.current));

    try {
      updateUploadTask(uploadId, { status: 'uploading', progress: 5 });
      const hash = await calculateFileHash(file);
      updateUploadTask(uploadId, { hash, progress: 10 });

      if (file.size > LARGE_FILE_THRESHOLD) {
        await uploadFileByChunks(file, uploadId, hash, albumId);
        const completedTask = uploadTasksRef.current.get(uploadId);
        return completedTask?.result;
      } else {
        updateUploadTask(uploadId, { progress: 30 });
        const result = await uploadFileNormal(file, albumId);
        updateUploadTask(uploadId, {
          status: 'completed',
          progress: 100,
          result,
        });
        return result;
      }
    } catch (error: any) {
      updateUploadTask(uploadId, {
        status: 'error',
        error: error.message || '上传失败',
      });
      throw error;
    }
  };

  const cancelUpload = async (uploadId: string) => {
    const abortController = cancelTokensRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
    }

    try {
      await cancelUploadAPI(uploadId);
      updateUploadTask(uploadId, { status: 'cancelled' });
      message.success('已取消上传');
    } catch (error) {
      console.error('取消上传失败:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedAlbumId) {
      message.error('请选择目标相册');
      return;
    }
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      uploadTasksRef.current.clear();
      setUploadTasks(new Map());

      const originalFiles = fileList.map((file) => file.originFileObj as File);
      let filesToUpload: File[] = originalFiles;

      message.loading({ content: '正在处理图片...', key: 'compressing', duration: 0 });

      try {
        const compressPromises = originalFiles.map(async (file, index) => {
          try {
            const compressed = await compressImage(file, { quality });
            const progress = Math.floor(((index + 1) / originalFiles.length) * 30);
            setUploadProgress(progress);
            return compressed;
          } catch (error) {
            console.error(`处理 ${file.name} 失败:`, error);
            return file;
          }
        });

        filesToUpload = await Promise.all(compressPromises);

        const originalSize = originalFiles.reduce((acc, file) => acc + file.size, 0);
        const compressedSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);
        if (compressedSize < originalSize) {
          const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
          message.success(`图片处理完成，体积减少 ${ratio}%`);
        }
      } catch {
        message.warning('部分图片处理失败，将使用原图上传');
        filesToUpload = originalFiles;
      } finally {
        message.destroy('compressing');
      }

      const uploadPromises = filesToUpload.map((file) => uploadSingleFile(file, selectedAlbumId));

      const results = await Promise.all(uploadPromises);
      const successResults = results.filter((r) => r !== undefined);

      setUploadProgress(100);
      message.success(`成功上传 ${successResults.length} 张照片`);
      setUploadedPhotos(successResults);
      setFileList([]);

      setTimeout(() => {
        setUploadProgress(0);
        uploadTasksRef.current.clear();
        setUploadTasks(new Map());
      }, 2000);
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleClearUploaded = () => {
    setUploadedPhotos([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4 px-2">
      {/* 页头 */}
      <header className="mb-6 flex shrink-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white sm:text-[1.75rem]">
            传图工作台
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-stroke bg-white/80 p-1 shadow-default dark:border-strokedark dark:bg-boxdark-2/80">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= activeStep;
            const isCurrent = index === activeStep;
            return (
              <div
                key={step.key}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${isCurrent
                  ? 'bg-primary text-white'
                  : isActive
                    ? 'text-primary'
                    : 'text-gray-400'
                  }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            );
          })}
        </div>
      </header>

      {albums.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-[#e7f2fe]/40 p-10 dark:border-primary/20 dark:bg-primary/5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(96,165,250,0.06) 12px, rgba(96,165,250,0.06) 13px)',
            }}
          />
          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e7f2fe] dark:bg-[#4e5969]">
              <FiAlertCircle className="size-6 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-black dark:text-white">还没有可用的相册</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              上传前需要先创建一个相册作为目的地。
            </p>
            <button
              type="button"
              onClick={() => navigate('/albums')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              去创建相册
              <FiArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* 左侧配置栏 */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
            <section className="overflow-hidden rounded-2xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark-2">
              <div className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                <div className="flex items-center gap-2.5 text-sm font-medium text-black dark:text-white">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#e7f2fe] dark:bg-[#4e5969]">
                    <FiFolder className="size-3.5 text-primary" />
                  </div>
                  目标相册
                </div>
              </div>
              <div className="p-4">
                <Select
                  placeholder="请选择相册"
                  value={selectedAlbumId}
                  onChange={setSelectedAlbumId}
                  className="upload-album-select w-full"
                  size="large"
                  optionLabelProp="label"
                  popupClassName="upload-album-select-popup"
                  options={albums.map((album) => ({
                    label: album.name,
                    value: album.id,
                    count: album.photo_count || 0,
                  }))}
                  optionRender={(option) => (
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate">{option.label}</span>
                      <span className="inline-flex h-4 shrink-0 items-center rounded px-1.5 text-[10px] font-medium leading-none tabular-nums text-primary/80 bg-primary/8 dark:bg-primary/15">
                        {option.data?.count ?? 0}
                      </span>
                    </div>
                  )}
                />

                {selectedAlbum && (
                  <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2.5 dark:bg-primary/10">
                    <p className="truncate text-sm font-medium text-black dark:text-white">{selectedAlbum.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      当前已有 {selectedAlbum.photo_count || 0} 张照片
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark-2">
              <div className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                <div className="flex items-center gap-2.5 text-sm font-medium text-black dark:text-white">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#e7f2fe] dark:bg-[#4e5969]">
                    <FiSliders className="size-3.5 text-primary" />
                  </div>
                  输出质量
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-5 gap-1.5">
                  {qualityOptions.map((opt) => {
                    const active = quality === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setQuality(opt.value)}
                        className={`group flex flex-col items-center rounded-xl border px-1 py-2.5 transition-colors ${active
                          ? 'border-primary bg-primary text-white'
                          : 'border-stroke bg-gray-50 text-gray-600 hover:border-primary/40 hover:bg-primary/5 dark:border-strokedark dark:bg-boxdark dark:text-gray-300 dark:hover:border-primary/50'
                          }`}
                      >
                        <span className="text-[11px] font-medium">{opt.label}</span>
                        <span
                          className={`mt-0.5 text-[10px] tabular-nums ${active ? 'opacity-80' : 'text-gray-400'
                            }`}
                        >
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  100 为原图无损；降低数值可显著节省存储，适合批量归档。
                </p>
              </div>
            </section>

            <div className="rounded-2xl border border-stroke bg-light-gradient p-4 shadow-default dark:border-strokedark dark:bg-dark-gradient">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">格式规范</p>
              <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-gray-500">
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  JPG · PNG · GIF · WEBP
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  单文件上限 30MB，支持批量拖拽
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  大文件自动分片，断点可续传
                </li>
              </ul>
            </div>
          </aside>

          {/* 右侧主操作区 */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark-2">
              <div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                {/* 裁切角标装饰 */}
                <div
                  className={`pointer-events-none absolute transition-all duration-300 ease-out ${isDragOver ? 'inset-2 sm:inset-3' : 'inset-4 sm:inset-5'
                    }`}
                >
                  {(
                    [
                      'left-0 top-0 border-l-2 border-t-2',
                      'right-0 top-0 border-r-2 border-t-2',
                      'bottom-0 left-0 border-b-2 border-l-2',
                      'bottom-0 right-0 border-b-2 border-r-2',
                    ] as const
                  ).map((position) => (
                    <span
                      key={position}
                      className={`absolute h-4 w-4 transition-all duration-300 ${position} ${isDragOver
                        ? 'h-6 w-6 border-primary'
                        : 'border-primary/30'
                        }`}
                    />
                  ))}
                </div>

                <Dragger
                  multiple
                  fileList={fileList}
                  beforeUpload={beforeUpload}
                  onChange={handleChange}
                  onRemove={handleRemove}
                  disabled={!selectedAlbumId || uploading}
                  accept="image/*"
                  listType="picture"
                  className="upload-darkroom flex min-h-0 flex-1 flex-col [&_.ant-upload-wrapper]:flex! [&_.ant-upload-wrapper]:min-h-0! [&_.ant-upload-wrapper]:flex-1! [&_.ant-upload-wrapper]:flex-col! [&_.ant-upload]:min-h-0! [&_.ant-upload]:h-full! [&_.ant-upload]:flex-1! [&_.ant-upload-drag]:flex! [&_.ant-upload-drag]:min-h-0! [&_.ant-upload-drag]:h-full! [&_.ant-upload-drag]:flex-1! [&_.ant-upload-drag]:border-0! [&_.ant-upload-drag]:bg-transparent! [&_.ant-upload-drag]:p-0! [&_.ant-upload-btn]:flex! [&_.ant-upload-btn]:h-full! [&_.ant-upload-btn]:w-full! [&_.ant-upload-drag-container]:flex! [&_.ant-upload-drag-container]:h-full! [&_.ant-upload-drag-container]:flex-1! [&_.ant-upload-list]:mt-3! [&_.ant-upload-list]:shrink-0!"
                  style={{ background: 'transparent', border: 'none' }}
                >
                  <div
                    onDragEnter={handleDropZoneDragEnter}
                    onDragLeave={handleDropZoneDragLeave}
                    onDragOver={handleDropZoneDragOver}
                    onDrop={resetDragOver}
                    className={`relative flex h-full min-h-[200px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border px-6 py-10 transition-all duration-300 ease-out ${!dropZoneEnabled
                      ? 'cursor-not-allowed border-stroke bg-gray-50/50 opacity-60 dark:border-strokedark dark:bg-boxdark/30'
                      : isDragOver
                        ? 'scale-[1.008] border-solid border-primary bg-primary/10 ring-4 ring-primary/15 dark:bg-primary/15 dark:ring-primary/25'
                        : 'border-dashed border-primary/25 bg-[length:20px_20px] bg-[#e7f2fe]/30 hover:border-primary/60 hover:bg-primary/5 dark:border-primary/20 dark:bg-boxdark/40 dark:hover:border-primary/50 dark:hover:bg-primary/10'
                      }`}
                    style={{
                      backgroundImage: isDragOver
                        ? 'radial-gradient(circle, rgba(96,165,250,0.22) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(96,165,250,0.12) 1px, transparent 1px)',
                    }}
                  >
                    {/* 拖入时的波纹层 */}
                    {isDragOver && (
                      <>
                        <div className="pointer-events-none absolute inset-0 rounded-xl bg-primary/5" />
                        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[length:24px_24px] opacity-60 animate-pulse" style={{ backgroundImage: 'radial-gradient(circle, rgba(96,165,250,0.35) 1.5px, transparent 1.5px)' }} />
                        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 overflow-hidden">
                          <div className="upload-drop-scan h-px w-1/3 bg-primary/70" />
                        </div>
                      </>
                    )}

                    <div
                      className={`relative z-1 mb-4 flex size-16 items-center justify-center rounded-2xl transition-all duration-300 ${isDragOver
                        ? 'scale-110 bg-primary text-white'
                        : 'bg-[#e7f2fe] dark:bg-[#4e5969]'
                        }`}
                      style={isDragOver ? { boxShadow: '0 0 0 8px rgba(96,165,250,0.12)' } : undefined}
                    >
                      {isDragOver ? (
                        <FiUploadCloud className="size-8 animate-bounce" />
                      ) : (
                        <HiOutlinePhotograph className={`size-8 ${dropZoneEnabled ? 'text-primary' : 'text-gray-400'}`} />
                      )}
                    </div>

                    <p
                      className={`relative z-1 text-base font-medium transition-all duration-300 ${isDragOver ? 'scale-105 text-primary' : 'text-black dark:text-white'
                        }`}
                    >
                      {isDragOver ? '松开鼠标，立即添加' : '拖拽图片到此处，或点击选取'}
                    </p>
                    <p className="relative z-1 mt-1.5 text-sm text-gray-500 transition-opacity duration-300">
                      {isDragOver ? '图片将自动进入上传队列' : '支持多选，队列会自动汇总'}
                    </p>
                  </div>
                </Dragger>
              </div>

              {/* 队列摘要与操作 */}
              {fileList.length > 0 && (
                <div className="shrink-0 border-t border-stroke px-4 py-4 dark:border-strokedark sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-[#e7f2fe] dark:bg-[#4e5969]">
                        <FiHardDrive className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">
                          已选 {fileList.length} 个文件
                        </p>
                        <p className="text-xs tabular-nums text-gray-500">合计 {formatFileSize(totalSelectedSize)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setFileList([])}
                        disabled={uploading}
                        className="inline-flex! items-center! gap-1.5!"
                        icon={<FiX className="size-3.5" />}
                      >
                        清空队列
                      </Button>
                      <Button
                        type="primary"
                        onClick={handleUpload}
                        loading={uploading}
                        disabled={!selectedAlbumId}
                        className="inline-flex! items-center! gap-1.5!"
                        icon={!uploading ? <FiUploadCloud className="size-3.5" /> : undefined}
                      >
                        开始传输
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 总进度 */}
              {uploading && uploadProgress > 0 && (
                <div className="shrink-0 border-t border-stroke px-4 py-4 dark:border-strokedark sm:px-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-black dark:text-white">整体进度</span>
                    <span className="tabular-nums text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#e7f2fe] dark:bg-boxdark">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 任务列表 */}
              {uploadTasks.size > 0 && (
                <div className="shrink-0 border-t border-stroke px-4 py-4 dark:border-strokedark sm:px-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">传输队列</p>
                  <div className="space-y-2">
                    {Array.from(uploadTasks.values()).map((task) => {
                      const meta = taskStatusMeta[task.status];
                      return (
                        <div
                          key={task.uploadId}
                          className="rounded-xl border border-stroke bg-primary/3 p-3 dark:border-strokedark dark:bg-primary/5"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-black dark:text-white">{task.file.name}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 text-[11px] ${meta.tone}`}>
                                  <span className={`size-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                  {task.status === 'uploading' &&
                                    ` · ${task.uploadedChunks.length}/${task.totalChunks} 分片`}
                                  {task.status === 'error' && task.error && ` · ${task.error}`}
                                </span>
                                <span className="text-[11px] tabular-nums text-gray-400">
                                  {formatFileSize(task.file.size)}
                                </span>
                              </div>
                            </div>
                            {task.status === 'uploading' && (
                              <button
                                type="button"
                                onClick={() => cancelUpload(task.uploadId)}
                                className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                              >
                                取消
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <FiCheck className="size-4 shrink-0 text-primary" />
                            )}
                            {task.status === 'checking' && (
                              <FiLoader className="size-4 shrink-0 animate-spin text-primary" />
                            )}
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-[#e7f2fe] dark:bg-boxdark">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${task.status === 'error' || task.status === 'cancelled'
                                ? 'bg-red-400'
                                : 'bg-primary'
                                }`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      )}

      {/* 上传成功 */}
      {uploadedPhotos.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark-2">
          <div className="flex flex-col gap-3 border-b border-stroke px-4 py-4 dark:border-strokedark sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#e7f2fe] dark:bg-[#4e5969]">
                <FiCheck className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-black dark:text-white">传输完成</h2>
                <p className="text-xs text-gray-500">共 {uploadedPhotos.length} 张照片已入库</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate(`/albums/${selectedAlbumId}`)}
                className="inline-flex! items-center! gap-1.5!"
                icon={<FiArrowUpRight className="size-3.5" />}
              >
                查看相册
              </Button>
              <Button
                danger
                type="primary"
                onClick={handleClearUploaded}
                className="inline-flex! items-center! gap-1.5!"
                icon={<FiTrash2 className="size-3.5" />}
              >
                清空列表
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {uploadedPhotos.map((photo, index) => (
              <article
                key={photo.id}
                className="group relative"
                style={{ transform: `rotate(${(index % 3) - 1}deg)` }}
              >
                <div className="overflow-hidden rounded-xl border border-stroke bg-white p-1.5 transition-transform duration-300 group-hover:rotate-0 dark:border-strokedark dark:bg-boxdark">
                  <div className="aspect-square overflow-hidden rounded-lg bg-[#e7f2fe]/50 dark:bg-boxdark-2">
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      className="size-full object-cover"
                      preview
                    />
                  </div>
                  <div className="px-1 py-2">
                    <p className="truncate text-xs font-medium text-black dark:text-white">{photo.name}</p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-gray-400">{formatFileSize(photo.size)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
