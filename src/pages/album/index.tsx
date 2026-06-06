import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, Card, Empty, Spin, Dropdown } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineEllipsis } from 'react-icons/ai';
import { useNavigate } from 'react-router';
import { Tooltip } from '@heroui/react';
import { getAlbumListAPI, createAlbumAPI, updateAlbumAPI, deleteAlbumAPI } from '@/api/album';
import type { Album, CreateAlbumParams, UpdateAlbumParams } from '@/types/album';
import type { MenuProps } from 'antd';
import FileSvg from '@/assets/svg/file.svg';

const { TextArea } = Input;

export default () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  // 加载相册列表
  const loadAlbums = async () => {
    try {
      setLoading(true);
      const { data } = await getAlbumListAPI({ limit: 9999 });
      setAlbums(data.result);
    } catch {
      message.error('加载相册列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

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
      message.error('删除相册失败');
    }
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
        Modal.confirm({
          title: '确定删除此相册吗？',
          content: '删除后将无法恢复',
          okText: '确定',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => handleDelete(album.id),
        });
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
          <Button type="primary" onClick={() => handleOpenModal()}>
            创建相册
          </Button>
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
                  <div className="bg-white rounded-xl !p-0.5 md:p-5 transition-all hover:-translate-y-1 overflow-hidden">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="w-full aspect-square flex items-center justify-center">
                        <img src={FileSvg} alt="" />
                      </div>
                      <div className="flex justify-between items-center w-full pb-2">
                        <div className="text-center w-full flex flex-col justify-center">
                          <div className="text-gray-800 truncate px-1 !text-sm md:text-base group-hover:text-blue-500 transition-colors" title="全部">
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
                    <div className="bg-white rounded-xl !p-0.5 md:p-5 transition-all hover:-translate-y-1 overflow-hidden">
                      {/* 封面区域 */}
                      <div className="flex flex-col items-center gap-2 justify-center">
                        {album.cover ? (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                            <img src={album.cover} alt={album.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          </div>
                        ) : (
                          <div className="w-full aspect-square flex items-center justify-center">
                            <img src={FileSvg} alt="" />
                          </div>
                        )}

                        {/* 相册名称和信息 */}
                        <div className="flex justify-between items-center w-full pb-2">
                          <div className="text-center w-full flex flex-col justify-center">
                            <div className="text-gray-800 truncate px-1 !text-sm md:text-base group-hover:text-blue-500 transition-colors" title={album.name}>
                              {album.name}
                            </div>

                            {album.cover && <div className="absolute bottom-[45px] right-2.5 backdrop-blur-xs shadow rounded-full px-2 py-1 text-xs text-white font-bold">{album.photo_count || 0}</div>}
                          </div>

                          {/* 操作按钮 */}
                          <div className="absolute bottom-[7px] right-2 border transition-all rounded-md hidden group-hover:block">
                            <Dropdown menu={{ items: getMenuItems(album) }} trigger={['click']}>
                              <Button type="text" size="small" icon={<AiOutlineEllipsis />} className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:shadow-xl border-0" onClick={(e) => e.stopPropagation()} />
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
