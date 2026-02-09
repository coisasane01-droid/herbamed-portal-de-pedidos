import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { OrderHistory } from './pages/OrderHistory';

const ThemeManager = ({ themeMode, primaryColor, faviconUrl, pwaIconUrl, adminPwaIconUrl, metaTitle, metaDescription, metaImageUrl, brandName }: { 
  themeMode: 'light' | 'dark', 
  primaryColor: string, 
  faviconUrl: string, 
  pwaIconUrl: string,
  adminPwaIconUrl?: string,
  metaTitle?: string,
  metaDescription?: string,
  metaImageUrl?: string,
  brandName: string
}) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    
    const metaTheme = document.getElementById('theme-color-meta');
    if (metaTheme) metaTheme.setAttribute('content', primaryColor);

    // Favicon Dinâmico
    if (faviconUrl) {
      const links = document.querySelectorAll("link[rel*='icon']");
      links.forEach(link => {
        (link as HTMLLinkElement).href = faviconUrl;
      });
    }

    // PWA Icon Dinâmico
    const currentPwaIcon = (isAdmin && adminPwaIconUrl) ? adminPwaIconUrl : pwaIconUrl;
    
    if (currentPwaIcon) {
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = currentPwaIcon;

      // Manifesto Dinâmico para suporte a temas e ícones customizáveis
      const manifestData = {
        "id": isAdmin ? "herbamed-portal-admin-v2" : "herbamed-portal-site-v2",
        "name": isAdmin ? `Admin - ${brandName}` : (metaTitle || brandName),
        "short_name": isAdmin ? "Admin" : brandName,
        "start_url": isAdmin ? "/#/admin" : "/#/",
        "scope": isAdmin ? "/#/admin" : "/",
        "display": "standalone",
        "background_color": isAdmin ? "#111827" : "#ffffff",
        "theme_color": primaryColor,
        "icons": [
          {
            "src": currentPwaIcon,
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": currentPwaIcon,
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": currentPwaIcon,
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      };

      const manifestStr = JSON.stringify(manifestData);
      const manifestDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(manifestStr);
      const manifestLink = document.getElementById('pwa-manifest') as HTMLLinkElement;
      if (manifestLink) {
        manifestLink.href = manifestDataUri;
      }
    }

    // SEO
    if (metaTitle) {
      document.title = metaTitle;
    }
    
    if (isAdmin && themeMode === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.style.backgroundColor = '#111827';
    } else {
      document.body.classList.remove('dark-theme');
      document.body.style.backgroundColor = '#f9fafb';
    }
  }, [primaryColor, themeMode, isAdmin, faviconUrl, pwaIconUrl, adminPwaIconUrl, metaTitle, metaDescription, metaImageUrl, brandName]);

  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const { 
    products, setProducts, 
    settings, setSettings, 
    user, setUser,
    users, addUser, deleteUser,
    cart, addToCart, removeFromCart, updateCartQuantity, clearCart,
    orders, addOrder, setOrders
  } = useStore();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Router>
      <ThemeManager 
        themeMode={settings.themeMode} 
        primaryColor={settings.primaryColor} 
        faviconUrl={settings.faviconUrl}
        pwaIconUrl={settings.pwaIconUrl}
        adminPwaIconUrl={settings.adminPwaIconUrl}
        metaTitle={settings.metaTitle}
        metaDescription={settings.metaDescription}
        metaImageUrl={settings.metaImageUrl}
        brandName={settings.brandName}
      />
      <ScrollToTop />
      <Layout settings={settings} cartCount={cartCount} cart={cart} user={user} setUser={setUser}>
        <Routes>
          <Route path="/" element={<Catalog products={products} onAddToCart={addToCart} settings={settings} cart={cart} />} />
          <Route path="/login" element={<Login setUser={setUser} addUser={addUser} settings={settings} />} />
          <Route path="/meus-pedidos" element={<OrderHistory orders={orders} user={user} settings={settings} />} />
          <Route path="/carrinho" element={<Cart cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} settings={settings} />} />
          <Route path="/checkout" element={<Checkout cart={cart} settings={settings} onPlaceOrder={addOrder} onClearCart={clearCart} user={user} />} />
          <Route path="/admin" element={<Admin products={products} setProducts={setProducts} settings={settings} setSettings={setSettings} orders={orders} setOrders={setOrders} users={users} deleteUser={deleteUser} />} />
          <Route path="*" element={<Catalog products={products} onAddToCart={addToCart} settings={settings} cart={cart} />} />
        </Routes>
      </Layout>
      <style>{`
        :root { --primary-color: #059669; }
        .dark-theme { color: #ffffff !important; color-scheme: dark; }
        .dark-theme .bg-white { background-color: #1f2937 !important; border-color: #374151 !important; }
        .dark-theme .bg-gray-50 { background-color: #111827 !important; border-color: #374151 !important; }
        .dark-theme h1, .dark-theme h2, .dark-theme h3, .dark-theme h4, .dark-theme h5, .dark-theme h6,
        .dark-theme p, .dark-theme span, .dark-theme label, .dark-theme td, .dark-theme th { color: #ffffff !important; }
        .dark-theme .text-gray-400, .dark-theme .text-gray-500 { color: #9ca3af !important; }
        .dark-theme input, .dark-theme textarea, .dark-theme select { background-color: #111827 !important; color: #ffffff !important; border-color: #374151 !important; }
      `}</style>
    </Router>
  );
};

export default App;