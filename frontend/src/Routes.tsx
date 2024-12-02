import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import FileManager from './pages/FileManager';
import Login from './pages/Login';
import Register from './pages/Register';

const Routes = () => {
  const token = localStorage.getItem('token');

  return (
    <RouterRoutes>
      <Route
        path="/"
        element={token ? <FileManager /> : <Navigate to="/login" replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </RouterRoutes>
  );
};

export default Routes; 