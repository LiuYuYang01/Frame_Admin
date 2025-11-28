import { useState, useEffect, useRef } from 'react';
import { Card, Upload, message, Select, Button, Progress, Space, Alert, Image, Tag } from 'antd';
import { AiOutlineInbox, AiOutlineUpload, AiOutlineDelete, AiOutlineCheckCircle } from 'react-icons/ai';
import type { UploadProps, UploadFile } from 'antd';
import { uploadFileAPI, checkInstantUploadAPI, chunkUploadAPI, getUploadProgressAPI, cancelUploadAPI } from '@/api/upload';
import { getAlbumListAPI } from '@/api/album';
import type { Album } from '@/types/album';
import { useNavigate } from 'react-router';
import { calculateFileHash } from '@/utils/hash';
import type { FileUploadTask } from '@/types/upload';

const { Dragger } = Upload;

interface UploadedPhoto {
  id: number;
  name: string;
  url: string;
  size: number;
}

export default () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [quality, setQuality] = useState<number>(100);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadTasks, setUploadTasks] = useState<Map<string, FileUploadTask>>(new Map());
  const uploadTasksRef = useRef<Map<string, FileUploadTask>>(new Map());
  const cancelTokensRef = useRef<Map<string, AbortController>>(new Map());

  // 分片大小：4MB
  const CHUNK_SIZE = 4 * 1024 * 1024;
  // 大文件阈值：超过 10MB 使用分片上传
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
  const qualityOptions = [
    { label: '原图 (100)', value: 100 },
    { label: '高清 (90)', value: 90 },
    { label: '均衡 (80)', value: 80 },
    { label: '压缩 (70)', value: 70 },
    { label: '极致压缩 (60)', value: 60 },
  ];

  // 加载相册列表
  const loadAlbums = async () => {
    try {
      const { data } = await getAlbumListAPI({ page: 1, limit: 100 });
      setAlbums(data.result);
      // 如果有相册，默认选择第一个
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

  // 上传前检查
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
    return false; // 阻止自动上传
  };

  // 文件列表变化
  const handleChange: UploadProps['onChange'] = (info) => {
    let newFileList = [...info.fileList];
    // 过滤掉状态为 error 的文件
    newFileList = newFileList.filter((file) => file.status !== 'error');
    setFileList(newFileList);
  };

  // 移除文件
  const handleRemove = (file: UploadFile) => {
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
  };

  // 更新上传任务状态
  const updateUploadTask = (uploadId: string, updates: Partial<FileUploadTask>) => {
    const task = uploadTasksRef.current.get(uploadId);
    if (task) {
      const updatedTask = { ...task, ...updates };
      uploadTasksRef.current.set(uploadId, updatedTask);
      setUploadTasks(new Map(uploadTasksRef.current));
    }
  };

  // 计算总体上传进度
  const calculateOverallProgress = () => {
    const tasks = Array.from(uploadTasksRef.current.values());
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.floor(totalProgress / tasks.length);
  };

  // 秒传检查
  const checkInstantUpload = async (file: File): Promise<boolean> => {
    try {
      const hash = await calculateFileHash(file);
      const result = await checkInstantUploadAPI({
        hash,
        fileSize: file.size,
      });

      if (result.data) {
        message.success(`${file.name} 秒传成功！`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('秒传检查失败:', error);
      return false;
    }
  };

  // 分片上传单个文件
  const uploadFileByChunks = async (file: File, uploadId: string, hash?: string, albumId?: number): Promise<void> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const abortController = new AbortController();
    cancelTokensRef.current.set(uploadId, abortController);

    // 检查上传进度（断点续传）
    try {
      const progressResult = await getUploadProgressAPI(uploadId);
      const uploadedChunks = progressResult.data.uploadedChunks || [];
      updateUploadTask(uploadId, {
        uploadedChunks,
        status: 'uploading',
      });

      // 上传未完成的分片
      for (let i = 0; i < totalChunks; i++) {
        // 检查是否已取消
        if (abortController.signal.aborted) {
          updateUploadTask(uploadId, { status: 'cancelled' });
          throw new Error('上传已取消');
        }

        // 跳过已上传的分片
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

        // 更新已上传的分片列表
        const newUploadedChunks = result.data.uploaded;
        updateUploadTask(uploadId, {
          uploadedChunks: newUploadedChunks,
          progress: Math.floor((newUploadedChunks.length / totalChunks) * 100),
        });
        setUploadProgress(calculateOverallProgress());

        // 如果所有分片上传完成
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

  // 普通上传单个文件
  const uploadFileNormal = async (file: File, albumId: number): Promise<any> => {
    const result = await uploadFileAPI({
      files: [file],
      albumId,
    });
    return result.data[0];
  };

  // 上传单个文件（自动选择上传方式）
  const uploadSingleFile = async (file: File, albumId: number): Promise<any> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建上传任务
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
      // 1. 秒传检查
      const isInstant = await checkInstantUpload(file);
      if (isInstant) {
        // 秒传成功，获取文件信息
        const hash = await calculateFileHash(file);
        const checkResult = await checkInstantUploadAPI({
          hash,
          fileSize: file.size,
        });
        if (checkResult.data) {
          updateUploadTask(uploadId, {
            status: 'completed',
            progress: 100,
            result: checkResult.data,
          });
          return checkResult.data;
        }
      }

      // 2. 计算文件 hash
      updateUploadTask(uploadId, { status: 'uploading', progress: 5 });
      const hash = await calculateFileHash(file);
      updateUploadTask(uploadId, { hash, progress: 10 });

      // 3. 根据文件大小选择上传方式
      if (file.size > LARGE_FILE_THRESHOLD) {
        // 大文件使用分片上传
        await uploadFileByChunks(file, uploadId, hash, albumId);
        const completedTask = uploadTasksRef.current.get(uploadId);
        return completedTask?.result;
      } else {
        // 小文件使用普通上传
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

  // 取消上传
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

  // 开始上传
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

      // 如果需要压缩，先压缩所有图片
      let filesToUpload: File[] = [];

      if (quality < 100) {
        message.loading({ content: '正在压缩图片...', key: 'compressing', duration: 0 });

        try {
          // 并行压缩所有图片
          const compressPromises = originalFiles.map(async (file, index) => {
            try {
              const compressed = await compressImage(file, quality);
              // 更新压缩进度
              const progress = Math.floor(((index + 1) / originalFiles.length) * 30);
              setUploadProgress(progress);
              return compressed;
            } catch (error) {
              console.error(`压缩 ${file.name} 失败:`, error);
              // 如果压缩失败，使用原图
              return file;
            }
          });

          filesToUpload = await Promise.all(compressPromises);

          // 计算压缩率
          const originalSize = originalFiles.reduce((acc, file) => acc + file.size, 0);
          const compressedSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);
          const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

          message.destroy('compressing');
          message.success(`图片压缩完成，压缩率: ${ratio}%`);
        } catch {
          message.destroy('compressing');
          message.warning('部分图片压缩失败，将使用原图上传');
          filesToUpload = originalFiles;
        }
      } else {
        filesToUpload = originalFiles;
      }

      // 并行上传所有文件
      const uploadPromises = filesToUpload.map((file) => uploadSingleFile(file, selectedAlbumId));

      const results = await Promise.all(uploadPromises);
      const successResults = results.filter((r) => r !== undefined);

      setUploadProgress(100);
      message.success(`成功上传 ${successResults.length} 张照片`);
      setUploadedPhotos(successResults);
      setFileList([]);

      // 2秒后重置进度条
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

  // 清空已上传列表
  const handleClearUploaded = () => {
    setUploadedPhotos([]);
  };

  /**
   * 压缩图片
   * @param file 原始文件
   * @param quality 压缩质量 (0-100)
   * @returns 压缩后的文件
   */
  const compressImage = (file: File, quality: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      // 如果是原图质量，直接返回原文件
      if (quality === 100) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('无法获取 canvas context'));
            return;
          }

          // 设置 canvas 尺寸为图片原始尺寸
          canvas.width = img.width;
          canvas.height = img.height;

          // 绘制图片到 canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 转换为 blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              // 创建新的 File 对象
              const compressedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            file.type || 'image/jpeg',
            quality / 100
          );
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-3">
      {albums.length === 0 ? (
        <Alert
          message="暂无相册"
          description={
            <p>
              <span>请先</span>
              <a href="/albums" className="text-blue-500 ml-1">
                创建相册
              </a>
            </p>
          }
          type="warning"
          showIcon
        />
      ) : (
        <div className="space-y-3">
          {/* 上传配置区域 */}
          <div>
            <Card title="上传配置" className="mb-6">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <label className="block mb-2 font-medium">目标相册</label>

                  <Select
                    placeholder="请选择相册"
                    value={selectedAlbumId}
                    onChange={setSelectedAlbumId}
                    style={{ width: '100%' }}
                    size="large"
                    options={albums.map((album) => ({
                      label: (
                        <Space>
                          <span>{album.name}</span>
                          <Tag color="blue">{album.photo_count || 0} 张</Tag>
                        </Space>
                      ),
                      value: album.id,
                    }))}
                  />

                  {selectedAlbumId && <Alert message="上传提示" description="支持拖拽上传，可一次选择多个文件。支持 JPG、PNG、GIF、WEBP 等格式，单个文件不超过 30MB。" type="info" showIcon className="!mt-3" />}
                </div>
                <div>
                  <label className="block mb-2 font-medium">输出质量</label>
                  <Select placeholder="请选择输出质量" value={quality} onChange={setQuality} style={{ width: '100%' }} size="large" options={qualityOptions} />
                  <p className="text-sm text-gray-500 mt-2">不选择或 100 表示原图，数值越高越清晰，越低越模糊，可用于节省空间。</p>
                </div>
              </Space>
            </Card>
          </div>

          {/* 上传区域 */}
          <div>
            <Card title="选择文件" className="mb-6">
              <Dragger multiple fileList={fileList} beforeUpload={beforeUpload} onChange={handleChange} onRemove={handleRemove} disabled={!selectedAlbumId || uploading} accept="image/*" listType="picture">
                <div className="flex justify-center items-center">
                  <AiOutlineInbox className="text-blue-500 text-6xl" />
                </div>
                <p className="ant-upload-text !my-3">点击或拖拽文件到此区域上传</p>
              </Dragger>

              {fileList.length > 0 && (
                <div className="mt-6 flex justify-between items-center">
                  <span className="text-gray-600">
                    已选择 {fileList.length} 个文件，总大小：
                    {(fileList.reduce((acc, file) => acc + (file.size || 0), 0) / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Space>
                    <Button onClick={() => setFileList([])}>清空</Button>
                    <Button type="primary" icon={<AiOutlineUpload />} onClick={handleUpload} loading={uploading} disabled={!selectedAlbumId}>
                      开始上传
                    </Button>
                  </Space>
                </div>
              )}

              {uploading && uploadProgress > 0 && (
                <div className="mt-6">
                  <Progress percent={uploadProgress} status={uploadProgress === 100 ? 'success' : 'active'} />
                </div>
              )}

              {/* 上传任务列表 */}
              {uploadTasks.size > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="text-sm font-medium">上传任务：</div>
                  {Array.from(uploadTasks.values()).map((task) => (
                    <div key={task.uploadId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm truncate flex-1">{task.file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{(task.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <Progress percent={task.progress} status={task.status === 'completed' ? 'success' : task.status === 'error' || task.status === 'cancelled' ? 'exception' : 'active'} size="small" />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {task.status === 'checking' && '检查中...'}
                          {task.status === 'uploading' && `上传中 ${task.uploadedChunks.length}/${task.totalChunks} 分片`}
                          {task.status === 'completed' && '上传完成'}
                          {task.status === 'error' && `错误: ${task.error}`}
                          {task.status === 'cancelled' && '已取消'}
                        </span>
                        {task.status === 'uploading' && (
                          <Button size="small" danger onClick={() => cancelUpload(task.uploadId)}>
                            取消
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 上传成功列表 */}
      {uploadedPhotos.length > 0 && (
        <Card
          title={
            <Space>
              <AiOutlineCheckCircle style={{ color: '#52c41a' }} />
              <span>上传成功</span>
              <Tag color="success">{uploadedPhotos.length} 张</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button onClick={() => navigate(`/albums/${selectedAlbumId}`)}>查看相册</Button>
              <Button type="primary" danger icon={<AiOutlineDelete />} onClick={handleClearUploaded}>
                清空列表
              </Button>
            </Space>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <Image src={photo.url} alt={photo.name} className="w-full h-40 object-cover rounded-lg" preview />
                <div className="mt-2">
                  <div className="text-sm text-gray-800 truncate">{photo.name}</div>
                  <div className="text-xs text-gray-500">{(photo.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
