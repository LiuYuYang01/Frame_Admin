import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input, Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiImage, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { loginAPI } from '@/api';
import { useUserStore } from '@/stores';
import { notification, message } from 'antd';
import type { LoginParams } from '@/types/user';

export default () => {
  const navigate = useNavigate();
  const setToken = useUserStore((state) => state.setToken);
  const setUser = useUserStore((state) => state.setUser);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginParams>({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      notification.warning({
        message: '提示',
        description: '请输入用户名',
      });
      return;
    }

    if (!formData.password.trim()) {
      notification.warning({
        message: '提示',
        description: '请输入密码',
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await loginAPI(formData);
      if (data?.token) {
        setToken(data.token);
        setUser(data.user);
        message.success(`欢迎回来，${data.user?.name || data.user?.username || ''}!`);
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* 网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(58,134,245,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(58,134,245,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* 登录卡片 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/40">
          {/* Logo 和标题 */}
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mb-8">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
                  <FiImage className="text-white text-3xl" />
                </div>
              </div>

              <h1 className="text-2xl font-bold ml-4">Frame</h1>
            </div>
          </motion.div>

          {/* 登录表单 */}
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  startContent={<FiUser className="text-gray-400 text-lg group-hover:text-blue-500 transition-colors" />}
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: 'text-base',
                    inputWrapper: 'border-gray-200 hover:border-blue-400 focus-within:!border-blue-500 transition-all group-hover:shadow-md',
                    label: 'text-gray-700 font-medium',
                  }}
                />
              </div>

              <div className="relative group">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  startContent={<FiLock className="text-gray-400 text-lg group-hover:text-blue-500 transition-colors" />}
                  endContent={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  }
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: 'text-base',
                    inputWrapper: 'border-gray-200 hover:border-blue-400 focus-within:!border-blue-500 transition-all group-hover:shadow-md',
                    label: 'text-gray-700 font-medium',
                  }}
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" color="primary" size="lg" isLoading={loading} endContent={!loading && <FiArrowRight size={20} />} className="w-full text-white font-bold shadow-lg hover:shadow-2xl transition-all">
                {loading ? '登录中...' : '立即登录'}
              </Button>
            </motion.div>
          </motion.form>

          {/* 装饰元素 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">© 2024 Frame. 让美好回忆井然有序 📸</p>
          </div>
        </div>

        {/* 浮动提示卡片 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full border border-white/40 shadow-lg">
            <span className="text-2xl">🎨</span>
            <span className="text-sm text-gray-700">强大的图片管理系统</span>
          </div>
        </motion.div>
      </motion.div>

      {/* 自定义动画样式 */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};
