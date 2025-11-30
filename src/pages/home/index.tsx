import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { motion } from 'framer-motion';
import { AiOutlineFolderOpen, AiOutlinePicture, AiOutlineUpload, AiOutlineArrowRight, AiOutlineCloudServer } from 'react-icons/ai';
import { useNavigate } from 'react-router';
import { getStatisAPI } from '@/api/statis';
import type { StatisData } from '@/types/statis';

export default () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await getStatisAPI();
        setStats(data);
      } catch (error) {
        console.error('加载统计数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const quickActions = [
    {
      title: '上传照片',
      description: '将照片上传到相册',
      icon: <AiOutlineUpload />,
      path: '/upload',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      hoverShadow: 'hover:shadow-blue-200',
    },
    {
      title: '管理相册',
      description: '创建和管理相册',
      icon: <AiOutlineFolderOpen />,
      path: '/albums',
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
      hoverShadow: 'hover:shadow-green-200',
    },
    {
      title: '浏览照片',
      description: '查看和管理照片',
      icon: <AiOutlinePicture />,
      path: '/photos',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      hoverShadow: 'hover:shadow-purple-200',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 },
    },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* 统计卡片 - 添加渐变背景和动画效果 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <motion.div variants={itemVariants}>
            <Card loading={loading} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity -z-10 translate-x-1/3 -translate-y-1/3" />

              <div className="relative z-10 flex items-center justify-between">
                <Statistic
                  title={<span className="text-gray-600 font-medium text-base">相册总数</span>}
                  value={stats?.album.count || 0}
                  valueStyle={{
                    color: '#00C27C',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                  }}
                  suffix={<span className="text-xl text-gray-500">个</span>}
                />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                  <AiOutlineFolderOpen className="text-white text-4xl" />
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <motion.div variants={itemVariants}>
            <Card loading={loading} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity -z-10 translate-x-1/3 -translate-y-1/3" />

              <div className="relative z-10 flex items-center justify-between">
                <Statistic
                  title={<span className="text-gray-600 font-medium text-base">照片总数</span>}
                  value={stats?.photo.count || 0}
                  valueStyle={{
                    color: '#1890ff',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                  }}
                  suffix={<span className="text-xl text-gray-500">张</span>}
                />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                  <AiOutlinePicture className="text-white text-4xl" />
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <motion.div variants={itemVariants}>
            <Card loading={loading} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity -z-10 translate-x-1/3 -translate-y-1/3" />

              <div className="relative z-10 flex items-center justify-between">
                <Statistic
                  title={<span className="text-gray-600 font-medium text-base">照片总大小</span>}
                  value={stats?.photo.totalSizeFormatted || '0 B'}
                  valueStyle={{
                    color: '#722ed1',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                  }}
                />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                  <AiOutlineCloudServer className="text-white text-4xl" />
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 快捷操作 - 重新设计卡片 */}
      <Row gutter={[16, 16]}>
        {quickActions.map((action, index) => (
          <Col xs={24} sm={12} lg={8} key={action.path}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => navigate(action.path)}
              className={`
                    relative overflow-hidden rounded-2xl cursor-pointer group
                    bg-gradient-to-br ${action.bgGradient}
                    border-2 border-transparent hover:border-white
                    shadow-md ${action.hoverShadow} hover:shadow-2xl
                    transition-all duration-300
                  `}
            >
              {/* 装饰性光效 */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 p-8">
                {/* 图标容器 */}
                <motion.div
                  className={`
                        w-16 h-16 rounded-2xl bg-gradient-to-br ${action.gradient}
                        flex items-center justify-center mb-6
                        shadow-lg group-hover:shadow-xl
                        group-hover:scale-110 transition-transform duration-300
                      `}
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-white text-3xl">{action.icon}</span>
                </motion.div>

                {/* 文本内容 */}
                <h3 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-gray-900">{action.title}</h3>
                <p className="text-gray-600 mb-6 text-sm">{action.description}</p>

                {/* 按钮 */}
                <motion.div
                  whileHover={{ x: 5 }}
                  className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-xl
                        bg-white shadow-md
                        ${action.iconColor} font-medium
                        group-hover:shadow-lg transition-all
                      `}
                >
                  <span>前往</span>
                  <AiOutlineArrowRight className="text-lg" />
                </motion.div>
              </div>

              {/* 底部装饰条 */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient}`} />
            </motion.div>
          </Col>
        ))}
      </Row>
    </motion.div>
  );
};
