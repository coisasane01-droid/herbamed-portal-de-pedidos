
import { useState, useEffect } from 'react';
import { Product, CartItem, Order, SiteSettings, User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    code: 'CUR001',
    ean: '7891234567890',
    name: 'Cúrcuma Premium 500mg',
    description: 'Extrato seco de Cúrcuma Longa com 95% de curcuminoides.',
    category: 'Suplementos',
    price: 45.90,
    image: 'https://images.unsplash.com/photo-1615485242231-8982db93cc0c?q=80&w=400&auto=format&fit=crop',
    inStock: true
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'user-001',
    name: 'Administrador Exemplo',
    email: 'comercial@herbamed.com.br',
    cnpj: '05.966.900/0001-00',
    razaoSocial: 'HERBAMED PRODUTOS NATURAIS LTDA',
    contato: '(62) 99308-1805'
  }
];

const INITIAL_SETTINGS: SiteSettings = {
  brandName: 'HERBAMED',
  brandLogoUrl: '',
  footerLogoUrl: '',
  faviconUrl: '',
  pwaIconUrl: '',
  adminPwaIconUrl: '',
  primaryColor: '#059669',
  footerBackgroundColor: '#022c22',
  footerTextColor: '#ffffff',
  themeMode: 'light',
  minOrderValue: 500.00,
  contactEmail: 'aneherbamed@gmail.com',
  contactWhatsapp: '5562993081805',
  billingOptions: ['Prazo médio 42 dias', '28 dias', '35 dias', '42 dias'],
  allowCustomBillingTerm: true,
  bannerMode: 'single',
  bannerImageUrl: 'https://images.unsplash.com/photo-1579722820308-d74e57198c79?auto=format&fit=crop&q=80&w=2000',
  bannerImages: [],
  bannerVideoUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  hideOutOfStock: true,
  categories: [
    { id: '1', name: 'Todas', image: '' },
    { id: '2', name: 'Suplementos', image: '' }
  ],
  footerCopyright: '© 2026 HERBAMED - PEDIDOS DIRETOS DA INDÚSTRIA',
  footerRestrictedText: 'PLATAFORMA DE ACESSO RESTRITO A PARCEIROS COMERCIAIS CADASTRADOS. TODOS OS PEDIDOS ESTÃO SUJEITOS A APROVAÇÃO DE CRÉDITO E ANÁLISE FISCAL.',
  privacyPolicyText: 'Seus dados serão processados de acordo com las leis vigentes para finalização e entrega dos seus pedidos.',
  creatorName: 'GENIUSCARD BRASIL',
  creatorUrl: 'https://wa.me/5562993884660',
  metaTitle: 'HERBAMED - Portal de Pedidos',
  metaDescription: 'Catálogo oficial Herbamed. Realize seus pedidos industriais com facilidade e segurança.',
  metaImageUrl: 'https://images.unsplash.com/photo-1615485242231-8982db93cc0c?w=1200&h=630&fit=crop',
  enableFreeShipping: true,
  freeShippingLabel: 'Grátis',
  aiCampaigns: {
    whatsappStatus: 'disconnected',
    whatsappApiKey: '',
    whatsappApiUrl: '',
    isActiveBirthday: false,
    birthdayPrompt: 'Um banner festivo de aniversário com suplementos naturais e cores suaves.',
    birthdayTemplate: 'Olá {{nome}}, a Herbamed deseja um feliz aniversário! Preparamos um presente especial para você em seu próximo pedido.',
    birthdayImage: '',
    isActiveInactive: false,
    inactiveDays: 7,
    inactivePrompt: 'Um design minimalista mostrando uma sacola de compras Herbamed vazia com pétalas de plantas.',
    inactiveTemplate: 'Sentimos sua falta, {{nome}}! Sua última compra incluiu: {{produtos}}. Que tal renovar seu estoque hoje?',
    inactiveImage: '',
    isActiveMass: false,
    massMessageTemplate: 'Confira as novidades da semana na Herbamed!',
    massMessageImage: ''
  }
};

export function useStore() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const triggerSystemNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: settings.pwaIconUrl || 'https://images.unsplash.com/photo-1615485242231-8982db93cc0c?w=192&h=192&fit=crop',
          badge: settings.faviconUrl || settings.pwaIconUrl || 'https://images.unsplash.com/photo-1615485242231-8982db93cc0c?w=96&h=96&fit=crop',
          vibrate: [200, 100, 200],
          tag: 'herbamed-activity',
          renotify: true,
          data: { url: window.location.origin }
        } as any);
      });
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.newValue) {
        if (e.key === 'herbamed_settings') setSettings(JSON.parse(e.newValue));
        if (e.key === 'herbamed_products') setProducts(JSON.parse(e.newValue));
        if (e.key === 'herbamed_orders') setOrders(JSON.parse(e.newValue));
        if (e.key === 'herbamed_user') setUser(JSON.parse(e.newValue));
        if (e.key === 'herbamed_cart') setCart(JSON.parse(e.newValue));
        if (e.key === 'herbamed_all_users') setUsers(JSON.parse(e.newValue));
      } else if (e.key === 'herbamed_user') {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const localProducts = localStorage.getItem('herbamed_products');
      const localSettings = localStorage.getItem('herbamed_settings');
      const localOrders = localStorage.getItem('herbamed_orders');
      const localUser = localStorage.getItem('herbamed_user');
      const localAllUsers = localStorage.getItem('herbamed_all_users');
      const localCart = localStorage.getItem('herbamed_cart');

      if (localProducts) setProducts(JSON.parse(localProducts));
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings);
        setSettings({ ...INITIAL_SETTINGS, ...parsedSettings });
      }
      if (localOrders) setOrders(JSON.parse(localOrders));
      if (localUser) setUser(JSON.parse(localUser));
      if (localAllUsers) {
        const parsedUsers = JSON.parse(localAllUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          setUsers(parsedUsers);
        }
      }
      if (localCart) setCart(JSON.parse(localCart));

      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const [
          { data: dbProducts },
          { data: dbSettings },
          { data: dbOrders }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('settings').select('data').single(),
          supabase.from('orders').select('*').order('date', { ascending: false })
        ]);

        if (dbProducts && dbProducts.length > 0) {
          setProducts(dbProducts);
          localStorage.setItem('herbamed_products', JSON.stringify(dbProducts));
        }

        if (dbSettings && dbSettings.data) {
          const freshSettings = { ...INITIAL_SETTINGS, ...dbSettings.data };
          setSettings(freshSettings);
          localStorage.setItem('herbamed_settings', JSON.stringify(freshSettings));
        }

        if (dbOrders) {
          setOrders(dbOrders);
          localStorage.setItem('herbamed_orders', JSON.stringify(dbOrders));
        }

        supabase.channel('public:orders_activity')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
            triggerSystemNotification(
              '📦 NOVO PEDIDO RECEBIDO!',
              `${newOrder.customer.razaoSocial} enviou um pedido de R$ ${newOrder.total.toFixed(2)}`
            );
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
            const updatedOrder = payload.new as Order;
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            triggerSystemNotification(
              '🔄 ATUALIZAÇÃO DE PEDIDO',
              `O pedido #${updatedOrder.id} agora está como: ${updatedOrder.status}`
            );
          })
          .subscribe();

      } catch (error) {
        console.error("Erro na sincronização Cloud:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('herbamed_cart', JSON.stringify(cart));
    }
  }, [cart, loading]);

  const saveProducts = async (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('herbamed_products', JSON.stringify(newProducts));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').delete().neq('id', '0');
        await supabase.from('products').insert(newProducts);
      } catch (e) { console.error("Falha ao salvar produtos na nuvem"); }
    }
  };

  const saveSettings = async (newSettings: SiteSettings) => {
    setSettings(newSettings);
    localStorage.setItem('herbamed_settings', JSON.stringify(newSettings));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('settings').upsert({ id: 1, data: newSettings });
      } catch (e) { console.error("Falha ao salvar ajustes na nuvem"); }
    }
  };

  const saveOrder = async (order: Order) => {
    const newOrders = [order, ...orders];
    setOrders(newOrders);
    localStorage.setItem('herbamed_orders', JSON.stringify(newOrders));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('orders').insert(order);
      } catch (e) { console.error("Falha ao salvar pedido na nuvem"); }
    }
  };

  const saveOrdersList = async (newList: Order[]) => {
    setOrders(newList);
    localStorage.setItem('herbamed_orders', JSON.stringify(newList));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('orders').delete().neq('id', '0');
        await supabase.from('orders').insert(newList);
      } catch (e) { console.error("Falha ao atualizar lista de pedidos na nuvem"); }
    }
  };

  const saveUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('herbamed_user', JSON.stringify(newUser));
      addUserToList(newUser);
    } else {
      localStorage.removeItem('herbamed_user');
    }
  };

  const addUserToList = (newUser: User) => {
    setUsers(prev => {
      const exists = prev.find(u => u.cnpj === newUser.cnpj || u.email === newUser.email);
      if (exists) return prev;
      const updated = [...prev, newUser];
      localStorage.setItem('herbamed_all_users', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteUserFromList = (userId: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => u.id !== userId);
      localStorage.setItem('herbamed_all_users', JSON.stringify(updated));
      return updated;
    });
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
          ? { ...item, quantity: item.quantity + quantity } 
          : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };

  const clearCart = () => setCart([]);

  return {
    products, setProducts: saveProducts,
    settings, setSettings: saveSettings,
    user, setUser: saveUser,
    users, addUser: addUserToList, deleteUser: deleteUserFromList,
    cart, addToCart, removeFromCart, updateCartQuantity, clearCart,
    orders, addOrder: saveOrder, setOrders: saveOrdersList,
    loading
  };
}
