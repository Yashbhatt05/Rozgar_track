import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import JobsPage from '../pages/JobsPage';
import JobDetailPage from '../pages/JobDetailPage';
import MetricsPage from '../pages/MetricsPage';

const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<JobsPage />} />
      <Route path="jobs" element={<JobsPage />} />
      <Route path=":id" element={<JobDetailPage />} />
      <Route path="dashboard" element={<MetricsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default AppRoutes;