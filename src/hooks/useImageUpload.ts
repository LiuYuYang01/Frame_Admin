import { useRef, useState } from 'react';
import { message } from 'antd';
import type { UploadFile } from 'antd';
import { preUploadAPI, confirmUploadAPI } from '@/api/upload';
import { calculateFileMD5 } from '@/utils/hash';
import { compressImage } from '@/utils/compressImage';
import { runWithConcurrency, uploadToQiniu } from '@/utils/directUpload';
import type { FileUploadTask, PreparedUploadFile, UploadFileResponse } from '@/types/upload';
import { DEFAULT_IMAGE_QUALITY } from '@/constants/upload';

const UPLOAD_CONCURRENCY = 3;

interface UseImageUploadOptions {
  onUploaded?: (photos: UploadFileResponse[]) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [quality, setQuality] = useState<number>(DEFAULT_IMAGE_QUALITY);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTasks, setUploadTasks] = useState<Map<string, FileUploadTask>>(new Map());

  const uploadTasksRef = useRef<Map<string, FileUploadTask>>(new Map());
  const cancelTokensRef = useRef<Map<string, AbortController>>(new Map());

  const updateUploadTask = (uploadId: string, updates: Partial<FileUploadTask>) => {
    const task = uploadTasksRef.current.get(uploadId);
    if (!task) {
      return;
    }

    const updatedTask = { ...task, ...updates };
    uploadTasksRef.current.set(uploadId, updatedTask);
    setUploadTasks(new Map(uploadTasksRef.current));
  };

  const calculateOverallProgress = () => {
    const tasks = Array.from(uploadTasksRef.current.values());
    if (tasks.length === 0) {
      return 0;
    }

    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.floor(totalProgress / tasks.length);
  };

  const prepareFiles = async (files: File[]): Promise<PreparedUploadFile[]> => {
    message.loading({ content: '正在处理图片...', key: 'compressing', duration: 0 });

    try {
      const prepared = await Promise.all(
        files.map(async (file, index) => {
          try {
            const result = await compressImage(file, { quality });
            setUploadProgress(Math.floor(((index + 1) / files.length) * 30));
            return result;
          } catch (error) {
            console.error(`处理 ${file.name} 失败:`, error);
            const fallback = await compressImage(file, { quality: 100 });
            return fallback;
          }
        }),
      );

      const originalSize = files.reduce((acc, file) => acc + file.size, 0);
      const compressedSize = prepared.reduce((acc, item) => acc + item.file.size, 0);
      if (compressedSize < originalSize) {
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        message.success(`图片处理完成，体积减少 ${ratio}%`);
      }

      return prepared;
    } finally {
      message.destroy('compressing');
    }
  };

  const uploadSingleFile = async (prepared: PreparedUploadFile, albumId: number): Promise<UploadFileResponse | undefined> => {
    const { file, width, height } = prepared;
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const abortController = new AbortController();
    cancelTokensRef.current.set(uploadId, abortController);

    const task: FileUploadTask = {
      file,
      uploadId,
      status: 'checking',
      progress: 0,
    };
    uploadTasksRef.current.set(uploadId, task);
    setUploadTasks(new Map(uploadTasksRef.current));

    try {
      updateUploadTask(uploadId, { status: 'checking', progress: 5 });
      const hash = await calculateFileMD5(file);
      updateUploadTask(uploadId, { hash, progress: 15 });

      if (abortController.signal.aborted) {
        updateUploadTask(uploadId, { status: 'cancelled' });
        return undefined;
      }

      const preResult = await preUploadAPI({
        hash,
        fileName: file.name,
        size: file.size,
        type: file.type,
        albumId,
        width,
        height,
      });

      if (preResult.data.instant) {
        updateUploadTask(uploadId, {
          status: 'completed',
          progress: 100,
          result: preResult.data.photo,
        });
        setUploadProgress(calculateOverallProgress());
        return preResult.data.photo;
      }

      updateUploadTask(uploadId, { status: 'uploading', progress: 20 });
      const { uploadToken, key, uploadUrl } = preResult.data;

      await uploadToQiniu({
        file,
        uploadToken,
        key,
        uploadUrl,
        signal: abortController.signal,
        onProgress: (percent) => {
          updateUploadTask(uploadId, {
            progress: 20 + Math.floor(percent * 0.6),
          });
          setUploadProgress(calculateOverallProgress());
        },
      });

      if (abortController.signal.aborted) {
        updateUploadTask(uploadId, { status: 'cancelled' });
        return undefined;
      }

      updateUploadTask(uploadId, { progress: 85 });
      const confirmResult = await confirmUploadAPI({
        hash,
        key,
        fileName: file.name,
        size: file.size,
        type: file.type,
        albumId,
        width,
        height,
      });

      updateUploadTask(uploadId, {
        status: 'completed',
        progress: 100,
        result: confirmResult.data,
      });
      setUploadProgress(calculateOverallProgress());

      return confirmResult.data;
    } catch (error) {
      if (abortController.signal.aborted || (error instanceof Error && error.message === '上传已取消')) {
        updateUploadTask(uploadId, { status: 'cancelled' });
        return undefined;
      }

      const errorMessage = error instanceof Error ? error.message : '上传失败';
      updateUploadTask(uploadId, {
        status: 'error',
        error: errorMessage,
      });
      throw error;
    } finally {
      cancelTokensRef.current.delete(uploadId);
    }
  };

  const cancelUpload = (uploadId: string) => {
    const abortController = cancelTokensRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
    }
    updateUploadTask(uploadId, { status: 'cancelled' });
    message.success('已取消上传');
  };

  const handleUpload = async (albumId: number) => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件');
      return [];
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      uploadTasksRef.current.clear();
      setUploadTasks(new Map());

      const originalFiles = fileList.map((item) => item.originFileObj as File);
      const preparedFiles = await prepareFiles(originalFiles);

      const results = await runWithConcurrency(preparedFiles, UPLOAD_CONCURRENCY, (prepared) =>
        uploadSingleFile(prepared, albumId),
      );
      const successResults = results.filter((item): item is UploadFileResponse => item !== undefined);

      setUploadProgress(100);
      message.success(`成功上传 ${successResults.length} 张照片`);
      setFileList([]);
      uploadTasksRef.current.clear();
      setUploadTasks(new Map());
      setUploadProgress(0);
      options.onUploaded?.(successResults);

      return successResults;
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
      return [];
    } finally {
      setUploading(false);
    }
  };

  return {
    quality,
    setQuality,
    fileList,
    setFileList,
    uploading,
    uploadProgress,
    uploadTasks,
    handleUpload,
    cancelUpload,
  };
}
