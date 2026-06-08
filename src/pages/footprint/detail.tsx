import { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Empty, Modal, Form, Input, Descriptions, Select, Checkbox, Pagination } from 'antd';
import { AiOutlineArrowLeft, AiOutlineDelete, AiOutlineEdit, AiOutlineEnvironment, AiOutlineSearch } from 'react-icons/ai';
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
  const [isPhotoSelectModalOpen, setIsPhotoSelectModalOpen] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLimit, setPhotosLimit] = useState(24);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // 加载足迹详情
  const loadFootprint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await getFootprintDetailAPI(Number(id));
      setFootprint(data);
      const imageUrls = data.images || [];
      form.setFieldsValue({
        title: data.title,
        content: data.content,
        address: data.address,
        position: data.position,
        images: imageUrls,
      });
      setSelectedPhotoUrls(imageUrls);
    } catch {
      message.error('加载足迹详情失败');
      navigate('/footprints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprint();
  }, [id]);

  // 加载相册列表
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

  // 加载相册照片
  const loadAlbumPhotos = async (albumId: number, page = photosPage, limit = photosLimit) => {
    try {
      setPhotosLoading(true);
      const { data } = await getAlbumPhotosAPI(albumId, {
        page,
        limit,
        width: 300,
        height: 300,
        keyword: debouncedKeyword || undefined,
      });
      setPhotos(data.result);
      setPhotosTotal(data.total);
    } catch {
      message.error('加载照片列表失败');
    } finally {
      setPhotosLoading(false);
    }
  };

  // 防抖处理搜索关键词
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
      setPhotosPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  // 当相册ID或搜索关键词变化时加载照片
  useEffect(() => {
    if (selectedAlbumId && isPhotoSelectModalOpen) {
      loadAlbumPhotos(selectedAlbumId, photosPage, photosLimit);
    }
  }, [selectedAlbumId, photosPage, photosLimit, debouncedKeyword, isPhotoSelectModalOpen]);

  // 提交编辑
  const handleSubmitEdit = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      const images = values.images && Array.isArray(values.images) ? values.images.filter((url: string) => url) : [];

      const params = {
        ...values,
        images: images.length > 0 ? images : undefined,
      };

      await updateFootprintAPI(Number(id), params as UpdateFootprintParams);
      message.success('更新足迹成功');
      setIsEditModalOpen(false);
      loadFootprint();
    } catch (error: any) {
      if (error?.errorFields) {
        return; // 表单验证错误，不显示错误消息
      }
      message.error('更新足迹失败');
    }
  };

  // 打开选择照片弹窗
  const handleOpenPhotoSelect = () => {
    setIsPhotoSelectModalOpen(true);
    loadAlbums();
    // 初始化选中状态为当前表单中的图片URL
    const currentImages = form.getFieldValue('images') || [];
    setSelectedPhotoUrls(Array.isArray(currentImages) ? currentImages : []);
    setPhotosPage(1);
    setSearchKeyword('');
  };

  // 确认选择照片
  const handleConfirmPhotoSelect = () => {
    form.setFieldsValue({ images: selectedPhotoUrls });
    setIsPhotoSelectModalOpen(false);
    setSelectedPhotoUrls([]);
  };

  // 切换照片选中状态
  const togglePhotoSelection = (photoUrl: string) => {
    setSelectedPhotoUrls((prev) => (prev.includes(photoUrl) ? prev.filter((url) => url !== photoUrl) : [...prev, photoUrl]));
  };

  // 删除足迹
  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteFootprintAPI(Number(id));
      message.success('删除足迹成功');
      navigate('/footprints');
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

  // 打开地图（如果支持）
  const handleOpenMap = (position?: string) => {
    if (!position) {
      message.warning('该足迹没有位置信息');
      return;
    }
    const [lng, lat] = position.split(',');
    // 使用高德地图或百度地图
    const url = `https://uri.amap.com/marker?position=${lng},${lat}`;
    window.open(url, '_blank');
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

  return (
    <div className="space-y-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineArrowLeft />} onClick={() => navigate('/footprints')} />
            <span className="text-xl font-semibold">足迹详情</span>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button icon={<AiOutlineEdit />} onClick={() => setIsEditModalOpen(true)}>
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

          {/* 图片展示 */}
          {footprint.images && footprint.images.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">图片 ({footprint.images.length})</h3>
              <PreviewImageGroup>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {footprint.images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <PreviewImage
                        src={imageUrl}
                        alt={`${footprint.title} - 图片 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </PreviewImageGroup>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">图片</h3>
              <Empty description="暂无图片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
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
          <Form.Item
            label="图片"
            name="images"
            extra={
              <div className="flex items-center justify-between mt-1">
                <span>从相册中选择图片</span>
                <Button type="link" size="small" onClick={handleOpenPhotoSelect}>
                  选择图片
                </Button>
              </div>
            }
          >
            <div className="min-h-[100px] border border-dashed border-gray-300 rounded p-3">
              {form.getFieldValue('images') && form.getFieldValue('images').length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {(form.getFieldValue('images') || []).map((url: string, index: number) => (
                    <div key={index} className="relative aspect-square rounded overflow-hidden">
                      <PreviewImage src={url} alt={`图片 ${index + 1}`} className="w-full h-full object-cover" preview={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-400">暂无图片，点击"选择图片"按钮从相册中选择</div>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal title="确定删除此足迹吗？" open={isDeleteModalOpen} onOk={handleDelete} onCancel={() => setIsDeleteModalOpen(false)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
        <p>删除后将无法恢复，请谨慎操作。</p>
      </Modal>

      {/* 选择照片弹窗 */}
      <Modal
        title="从相册选择图片"
        open={isPhotoSelectModalOpen}
        onOk={handleConfirmPhotoSelect}
        onCancel={() => {
          setIsPhotoSelectModalOpen(false);
          setSelectedPhotoUrls([]);
          setSearchKeyword('');
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
                setSelectedPhotoUrls([]);
              }}
              style={{ width: 300 }}
              options={albums.map((album) => ({ label: album.name, value: album.id }))}
            />
            <div className="text-gray-600">已选择 {selectedPhotoUrls.length} 张图片</div>
          </div>

          {selectedAlbumId && (
            <>
              <Input placeholder="搜索照片名称" prefix={<AiOutlineSearch />} value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} allowClear />

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
                      const isSelected = selectedPhotoUrls.includes(photo.url);
                      return (
                        <div key={photo.id} className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`} onClick={() => togglePhotoSelection(photo.url)}>
                          <div className="h-32 rounded-lg overflow-hidden">
                            <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                          </div>
                          <Checkbox checked={isSelected} className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()} onChange={() => togglePhotoSelection(photo.url)} />
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
