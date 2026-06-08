import { Upload, message, Select, Button, Progress, Space, Alert } from 'antd';
import { AiOutlineInbox, AiOutlineUpload } from 'react-icons/ai';
import type { UploadProps, UploadFile } from 'antd';
import { formatFileSize } from '@/utils/formatSize';
import { useImageUpload } from '@/hooks/useImageUpload';

const { Dragger } = Upload;

interface UploadComponentProps {
  albumId?: number | null;
  onUploaded?: (photos: any[]) => void;
}

const qualityOptions = [
  { label: '原图 (100)', value: 100 },
  { label: '高清 (90)', value: 90 },
  { label: '均衡 (80)', value: 80 },
  { label: '压缩 (70)', value: 70 },
  { label: '极致压缩 (60)', value: 60 },
];

const UploadPanel = ({ albumId, onUploaded }: UploadComponentProps) => {
  const { quality, setQuality, fileList, setFileList, uploading, uploadProgress, uploadTasks, handleUpload, cancelUpload } =
    useImageUpload({ onUploaded });

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;
    }
    const isLt30M = file.size / 1024 / 1024 < 50;
    if (!isLt30M) {
      message.error('图片大小不能超过 30MB！');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    const newFileList = [...info.fileList].filter((file) => file.status !== 'error');
    setFileList(newFileList);
  };

  const handleRemove = (file: UploadFile) => {
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  const startUpload = async () => {
    if (!albumId) {
      message.error('未提供目标相册 ID');
      return;
    }
    await handleUpload(albumId);
  };

  return (
    <div className="space-y-3">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <label className="block mb-2 font-medium">输出质量</label>
          <Select placeholder="请选择输出质量" value={quality} onChange={setQuality} style={{ width: '100%' }} size="large" options={qualityOptions} />
          <p className="text-sm text-gray-500 mt-2">不选择或 100 表示原图，数值越高越清晰，越低越模糊，可用于节省空间。</p>
        </div>
        <Alert
          message="上传提示"
          description="图片将直传七牛云，支持秒传去重。支持 JPG、PNG、GIF、WEBP 等格式，单个文件不超过 30MB。"
          type="info"
          showIcon
        />
      </Space>

      <Dragger
        multiple
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        onRemove={handleRemove}
        disabled={!albumId || uploading}
        accept="image/*"
        listType="picture"
      >
        <div className="flex justify-center items-center">
          <AiOutlineInbox className="text-blue-500 text-6xl" />
        </div>
        <p className="ant-upload-text !my-3">点击或拖拽文件到此区域上传</p>
      </Dragger>

      {fileList.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <span className="text-gray-600">
            已选择 {fileList.length} 个文件，总大小：
            {formatFileSize(fileList.reduce((acc, file) => acc + (file.size || 0), 0))}
          </span>
          <Space>
            <Button onClick={() => setFileList([])}>清空</Button>
            <Button type="primary" icon={<AiOutlineUpload />} onClick={startUpload} loading={uploading} disabled={!albumId}>
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

      {uploadTasks.size > 0 && (
        <div className="mt-6 space-y-2">
          <div className="text-sm font-medium">上传任务：</div>
          {Array.from(uploadTasks.values()).map((task) => (
            <div key={task.uploadId} className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm truncate flex-1">{task.file.name}</span>
                <span className="text-xs text-gray-500 ml-2">{formatFileSize(task.file.size)}</span>
              </div>
              <Progress
                percent={task.progress}
                status={task.status === 'completed' ? 'success' : task.status === 'error' || task.status === 'cancelled' ? 'exception' : 'active'}
                size="small"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {task.status === 'checking' && '校验中...'}
                  {task.status === 'uploading' && `直传七牛 ${task.progress}%`}
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
    </div>
  );
};

export default UploadPanel;
