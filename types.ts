
export interface User {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  contato?: string;
  dataNascimento?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Product {
  id: string;
  code: string;
  ean?: string; // Código de Barras
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number; // Preço original (riscado)
  image: string;
  inStock: boolean;
  isHighlighted?: boolean; // Selo de Destaque configurável
  expirationDate?: string; // Data de vencimento
  bulaUrl?: string; // Link para a bula (PDF ou imagem)
  nutritionalInfo?: string; // Informação Nutricional / Tabela
  indicationsImageUrl?: string; // Foto de indicações e benefícios
  indicationsText?: string; // Texto de indicações e benefícios (caso não haja foto)
  showBula?: boolean; // Ativar/Desativar visualização da bula
  showNutritionalInfo?: boolean; // Ativar/Desativar visualização nutricional
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  customerEmail: string; // Vínculo com o usuário
  customer: {
    razaoSocial: string;
    cnpj: string;
    responsible: string;
    phone: string;
  };
  items: CartItem[];
  total: number;
  billingTerm: string;
  status: 'Pendente' | 'Recebido' | 'Concluído';
  observation?: string; // Observação opcional do pedido
}

export interface AICampaignSettings {
  whatsappStatus: 'connected' | 'disconnected';
  whatsappApiKey?: string;
  whatsappApiUrl?: string;
  // Campanha de Aniversário
  isActiveBirthday: boolean;
  birthdayPrompt: string;
  birthdayTemplate: string;
  birthdayImage: string;
  // Recuperação de Clientes
  isActiveInactive: boolean;
  inactiveDays: number;
  inactivePrompt: string;
  inactiveTemplate: string;
  inactiveImage: string;
  // Disparo em Massa
  isActiveMass: boolean;
  massMessageTemplate: string;
  massMessageImage: string;
}

export interface SiteSettings {
  brandName: string;
  brandLogoUrl: string;
  footerLogoUrl?: string;
  faviconUrl: string;
  pwaIconUrl: string;
  adminPwaIconUrl?: string;
  primaryColor: string;
  footerBackgroundColor?: string;
  footerTextColor?: string;
  themeMode: 'light' | 'dark';
  minOrderValue: number;
  contactEmail: string;
  contactWhatsapp: string;
  billingOptions: string[];
  allowCustomBillingTerm: boolean;
  bannerMode: 'single' | 'carousel' | 'video';
  bannerImageUrl: string;
  bannerImages: string[];
  bannerVideoUrl: string;
  bannerVideoFileUrl?: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  hideOutOfStock: boolean;
  categories: Category[];
  footerCopyright: string;
  footerRestrictedText: string;
  aiCampaigns?: AICampaignSettings;
  privacyPolicyText?: string;
  creatorName?: string;
  creatorUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaImageUrl?: string;
  // FRETE
  enableFreeShipping?: boolean;
  freeShippingLabel?: string;
}
