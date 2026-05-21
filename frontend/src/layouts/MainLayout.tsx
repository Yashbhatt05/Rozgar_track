import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import { themeStore } from '../stores/themestores';

const MainLayout = () => {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
      data-theme={themeStore.theme}
    >
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;