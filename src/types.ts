export interface SiteConfig {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  fax?: string;
  representative?: string;
  address: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  features: string[];
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
