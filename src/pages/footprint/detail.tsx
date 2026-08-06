import { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Empty, Modal, Form, Input, Descriptions, Select } from 'antd';
import { AiOutlineArrowLeft, AiOutlineDelete, AiOutlineEdit, AiOutlineEnvironment } from 'react-icons/ai';
import { useParams, useNavigate } from 'react-router';
import { getFootprintDetailAPI, updateFootprintAPI, deleteFootprintAPI } from '@/api/footprint';
import { getAlbumListAPI, getAlbumPhotosAPI } from '@/api/album';
import type { Footprint, UpdateFootprintParams } from '@/types/footprint';
import type { Album } from '@/types/album';
import type { Photo } from '@/types/photo';
import { PreviewImage, PreviewImageGroup } from '@/components/PreviewImage';

const { TextArea } = Input;

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [footprint, setFootprint] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  // 加载足迹详情
  const loadFootprint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await getFootprintDetailAPI(Number(id));
      setFootprint(data);
      form.setFieldsValue({
        title: data.title,
        content: data.content,
        address: data.address,
        position: data.position,
        cover: data.cover,
        album_id: data.album_id,
      });
    } catch {
      message.error('加载足迹详情失败');
      navigate('/footprint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprint();
  }, [id]);

  // 根据关联相册加载照片
  const loadAlbumPhotos = async (albumId?: number) => {
    if (!albumId) {
      setPhotos([]);
      return;
    }
    try {
      setPhotosLoading(true);
      const { data } = await getAlbumPhotosAPI(albumId, { page: 1, limit: 200 });
      setPhotos(data.result || []);
    } catch {
      message.error('加载相册照片失败');
      setPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  useEffect(() => {
    if (footprint?.album_id) {
      loadAlbumPhotos(footprint.album_id);
    } else {
      setPhotos([]);
    }
  }, [footprint?.album_id]);

  // 加载相册列表（编辑弹窗用）
  const loadAlbums = async () => {
    try {
      setAlbumsLoading(true);
      const { data } = await getAlbumListAPI({ page: 1, limit: 200 });
      setAlbums(data.result || []);
    } catch {
      message.error('加载相册列表失败');
    } finally {
      setAlbumsLoading(false);
    }
  };

  // 提交编辑
  const handleSubmitEdit = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      const params = {
        ...values,
        cover: values.cover || undefined,
        album_id: values.album_id || undefined,
      };

      await updateFootprintAPI(Number(id), params as UpdateFootprintParams);
      message.success('更新足迹成功');
      setIsEditModalOpen(false);
      loadFootprint();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error('更新足迹失败');
    }
  };

  // 删除足迹
  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteFootprintAPI(Number(id));
      message.success('删除足迹成功');
      navigate('/footprint');
    } catch {
      message.error('删除足迹失败');
    }
  };

  // 格式化位置坐标
  const formatPosition = (position?: string) => {
    if (!position) return null;
    const [lng, lat] = position.split(',');
    return { lng: parseFloat(lng), lat: parseFloat(lat) };
  };

  // 打开地图
  const handleOpenMap = (position?: string) => {
    if (!position) {
      message.warning('该足迹没有位置信息');
      return;
    }
    const [lng, lat] = position.split(',');
    const url = `https://uri.amap.com/marker?position=${lng},${lat}`;
    window.open(url, '_blank');
  };

  // 打开编辑弹窗
  const handleOpenEdit = () => {
    setIsEditModalOpen(true);
    loadAlbums();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!footprint) {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty description="足迹不存在" />
      </div>
    );
  }

  const position = formatPosition(footprint.position);
  const coverUrl = footprint.cover || footprint.album_cover;

  return (
    <div className="space-y-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineArrowLeft />} onClick={() => navigate('/footprint')} />
            <span className="text-xl font-semibold">足迹详情</span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineEdit />} onClick={handleOpenEdit}>
              编辑
            </Button>
            <Button danger icon={<AiOutlineDelete />} onClick={() => setIsDeleteModalOpen(true)}>
              删除
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* 标题 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{footprint.title}</h2>
            <div className="text-gray-500 text-sm">创建于 {new Date(footprint.create_time).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          {/* 内容描述 */}
          {footprint.content && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-700">内容描述</h3>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{footprint.content}</p>
            </div>
          )}

          {/* 地址和位置信息 */}
          {(footprint.address || footprint.position) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">位置信息</h3>
              <Descriptions column={1} bordered size="small">
                {footprint.address && (
                  <Descriptions.Item label="地址">
                    <div className="flex items-center gap-2">
                      <AiOutlineEnvironment className="text-blue-500" />
                      <span>{footprint.address}</span>
                    </div>
                  </Descriptions.Item>
                )}
                {footprint.position && (
                  <Descriptions.Item label="坐标">
                    <div className="flex items-center gap-2">
                      <span>
                        经度: {position?.lng}, 纬度: {position?.lat}
                      </span>
                      <Button type="link" size="small" icon={<AiOutlineEnvironment />} onClick={() => handleOpenMap(footprint.position)}>
                        查看地图
                      </Button>
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          {/* 关联相册 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">关联相册</h3>
            {footprint.album_id && footprint.album_name ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {coverUrl && (
                  <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                    <img src={coverUrl} alt={footprint.album_name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{footprint.album_name}</div>
                  <Button type="link" size="small" className="!px-0" onClick={() => navigate(`/albums/${footprint.album_id}`)}>
                    查看相册详情 →
                  </Button>
                </div>
              </div>
            ) : (
              <Empty description="未关联相册" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          {/* 相册照片展示 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">照片 ({photos.length})</h3>
            {photosLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spin />
              </div>
            ) : photos.length > 0 ? (
              <PreviewImageGroup>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <PreviewImage src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </PreviewImageGroup>
            ) : (
              <Empty description="暂无照片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>
      </Card>

      {/* 编辑弹窗 */}
      <Modal title="编辑足迹" open={isEditModalOpen} onOk={handleSubmitEdit} onCancel={() => setIsEditModalOpen(false)} okText="确定" cancelText="取消" width={600}>
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
          <Form.Item label="关联相册" name="album_id" extra="选择相册后，前端足迹详情将展示该相册中的照片，并支持一键跳转">
            <Select
              placeholder="请选择关联相册（可选）"
              allowClear
              loading={albumsLoading}
              notFoundContent={albumsLoading ? <Spin size="small" /> : '暂无相册'}
              options={albums.map((album) => ({ label: album.name, value: album.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="封面图片URL" name="cover" rules={[{ max: 500, message: 'URL不能超过500个字符' }]} extra="留空则使用关联相册的封面">
            <Input placeholder="请输入封面图片URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal title="确定删除此足迹吗？" open={isDeleteModalOpen} onOk={handleDelete} onCancel={() => setIsDeleteModalOpen(false)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
        <p>删除后将无法恢复，请谨慎操作。</p>
      </Modal>
    </div>
  );
};
