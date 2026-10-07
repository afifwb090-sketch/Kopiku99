import React, { useState } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { StorePage } from './pages/StorePage';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductsAdmin } from './pages/admin/ProductsAdmin';
import { CategoriesAdmin } from './pages/admin/CategoriesAdmin';
import { InventoryAdmin } from './pages/admin/InventoryAdmin';
import { PayablesAdmin } from './pages/admin/PayablesAdmin';
import { OrdersAdmin } from './pages/admin/OrdersAdmin';
import { ReportsAdmin } from './pages/admin/ReportsAdmin';
import { SettingsAdmin } from './pages/admin/SettingsAdmin';

function AppContent() {
  const { path } = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Normalize path without trailing slash (except for '/')
  const currentPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  // Route routing
  const renderRoute = () => {
    switch (currentPath) {
      case '/':
        return (
          <>
            <Navbar onOpenCart={() => setIsCartOpen(true)} />
            <LandingPage onOpenCart={() => setIsCartOpen(true)} />
          </>
        );

      case '/store':
        return (
          <>
            <Navbar onOpenCart={() => setIsCartOpen(true)} />
            <StorePage isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
          </>
        );

      case '/login':
        return <LoginPage />;

      case '/pos':
        return <PosPage />;

      case '/admin':
        return <AdminDashboard />;

      case '/admin/products':
        return <ProductsAdmin />;

      case '/admin/categories':
        return <CategoriesAdmin />;

      case '/admin/inventory':
        return <InventoryAdmin />;

      case '/admin/payables':
        return <PayablesAdmin />;

      case '/admin/orders':
        return <OrdersAdmin />;

      case '/admin/reports':
        return <ReportsAdmin />;

      case '/admin/settings':
        return <SettingsAdmin />;

      default:
        // Fallback for subpaths or undefined
        if (currentPath.startsWith('/admin')) {
          return <AdminDashboard />;
        }
        return (
          <>
            <Navbar onOpenCart={() => setIsCartOpen(true)} />
            <LandingPage onOpenCart={() => setIsCartOpen(true)} />
          </>
        );
    }
  };

  return <div className="min-h-screen bg-slate-950 font-sans">{renderRoute()}</div>;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
