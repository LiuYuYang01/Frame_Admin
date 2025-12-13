import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Layout from '@/pages/layout';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Albums from '@/pages/album';
import AlbumDetail from '@/pages/album/detail';
import Footprint from '@/pages/footprint';
import Upload from '@/pages/upload';
import { useUserStore } from '@/stores';

// 路由守卫组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUserStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// 登录页面路由守卫（已登录则跳转到首页）
const LoginRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUserStore((state) => state.token);
  return token ? <Navigate to="/" replace /> : <>{children}</>;
};

export default () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginRoute>
              <Login />
            </LoginRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="albums" element={<Albums />} />
          <Route path="albums/:id" element={<AlbumDetail />} />
          <Route path="footprint" element={<Footprint />} />
          <Route path="upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
