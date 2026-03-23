import * as React from 'react';
import { useEffect, useState, useCallback, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useSearchParams } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { SiteConfig, Product, UserProfile } from './types';
import { Menu, X, Settings, LogOut, Phone, Mail, MapPin, ChevronRight, ChevronDown, Factory, Utensils, ShieldCheck, Clock, AlertCircle, Quote } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const isAdmin = (user: User | null) => {
  return user?.email === "tyouing1563@gmail.com";
};

const ErrorDisplay = ({ errorInfo, onReset }: { errorInfo: string; onReset: () => void }) => {
  let message = "알 수 없는 오류가 발생했습니다.";
  try {
    const parsed = JSON.parse(errorInfo);
    if (parsed.error.includes('permissions')) {
      message = "접근 권한이 없습니다. 관리자 계정으로 로그인해 주세요.";
    }
  } catch (e) {
    message = errorInfo;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">오류 발생</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <button
          onClick={onReset}
          className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl"
        >
          새로고침
        </button>
      </div>
    </div>
  );
};

const Navbar = ({ config, user }: { config: SiteConfig; user: User | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: '홈', path: '/' },
    { name: '회사소개', path: '/about' },
    { 
      name: '제품소개', 
      path: '/products',
      subLinks: [
        { name: 'STEEL BAND OVEN', path: '/products?category=STEEL BAND OVEN' },
        { name: '벨트컨베이어', path: '/products?category=벨트컨베이어' },
        { name: '샌딩머신', path: '/products?category=샌딩머신' },
        { name: '오일스프레이, 소금스프레이', path: '/products?category=오일스프레이, 소금스프레이' },
      ]
    },
    { name: '고객지원', path: '/contact' },
  ];

  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative px-1.5 py-1.5 bg-gradient-to-br from-blue-950 to-blue-800 rounded-[50%] flex items-center justify-center shadow-md border border-white/10 overflow-hidden transition-all duration-300 group-hover:shadow-blue-900/30 group-hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
              <span className="relative text-white font-gungsuh font-bold text-lg tracking-[0.1em] leading-none">
                SEIL
              </span>
              <div className="absolute -right-1 -top-1 w-4 h-4 bg-white/5 rounded-full blur-sm" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">
              {config.siteName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <div 
                key={link.path} 
                className="relative group/nav"
                onMouseEnter={() => link.subLinks && setActiveSubMenu(link.name)}
                onMouseLeave={() => setActiveSubMenu(null)}
              >
                <Link
                  to={link.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-blue-900 flex items-center gap-1 py-8",
                    location.pathname === link.path ? "text-blue-900" : "text-gray-600"
                  )}
                >
                  {link.name}
                  {link.subLinks && <ChevronDown className="w-4 h-4" />}
                </Link>

                {link.subLinks && (
                  <div className={cn(
                    "absolute top-full left-0 w-64 bg-white shadow-xl border border-gray-100 rounded-2xl py-4 transition-all duration-200 opacity-0 invisible translate-y-2 group-hover/nav:opacity-100 group-hover/nav:visible group-hover/nav:translate-y-0",
                  )}>
                    {link.subLinks.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className="block px-6 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {user && (
              <Link to="/admin" className="p-2 text-gray-500 hover:text-blue-900 transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <div key={link.path}>
                  <div className="flex items-center justify-between">
                    <Link
                      to={link.path}
                      onClick={() => !link.subLinks && setIsOpen(false)}
                      className={cn(
                        "block px-3 py-4 text-base font-medium",
                        location.pathname === link.path ? "text-blue-900" : "text-gray-600"
                      )}
                    >
                      {link.name}
                    </Link>
                    {link.subLinks && (
                      <button 
                        onClick={() => setActiveSubMenu(activeSubMenu === link.name ? null : link.name)}
                        className="p-4"
                      >
                        <ChevronDown className={cn("w-5 h-5 transition-transform", activeSubMenu === link.name && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {link.subLinks && activeSubMenu === link.name && (
                    <div className="bg-gray-50 rounded-xl mb-2">
                      {link.subLinks.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setIsOpen(false)}
                          className="block px-8 py-3 text-sm text-gray-600 hover:text-blue-900"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {user && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-blue-900 hover:bg-gray-50 rounded-md"
                >
                  관리자 설정
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = ({ config }: { config: SiteConfig }) => (
  <footer className="bg-gray-900 text-gray-400 py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-3 mb-6 group">
            <div className="relative px-1.5 py-1.5 bg-gradient-to-br from-blue-800 to-blue-600 rounded-[50%] flex items-center justify-center shadow-md border border-white/10 overflow-hidden">
              <span className="relative text-white font-gungsuh font-bold text-sm tracking-[0.1em] leading-none">
                SEIL
              </span>
            </div>
            <span className="text-xl font-bold text-white">{config.siteName}</span>
          </div>
          <p className="max-w-sm mb-8 leading-relaxed">
            최고의 기술력과 신뢰를 바탕으로 식품기계 및 터널형 스틸밴드 오븐 제작의 새로운 기준을 제시합니다.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{config.address}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                <span>TEL: {config.contactPhone}</span>
              </div>
              {config.fax && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0 rotate-90" />
                  <span>FAX: {config.fax}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{config.contactEmail}</span>
            </div>
            {config.representative && (
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 flex items-center justify-center text-blue-500 font-bold text-[10px] border border-blue-500 rounded-full shrink-0">人</div>
                <span>대표자: {config.representative}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-6">주요 제품</h4>
          <ul className="space-y-4">
            <li><Link to="/products?category=STEEL BAND OVEN" className="hover:text-white transition-colors">STEEL BAND OVEN</Link></li>
            <li><Link to="/products?category=벨트컨베이어" className="hover:text-white transition-colors">벨트컨베이어</Link></li>
            <li><Link to="/products?category=샌딩머신" className="hover:text-white transition-colors">샌딩머신</Link></li>
            <li><Link to="/products?category=오일스프레이, 소금스프레이" className="hover:text-white transition-colors">오일스프레이, 소금스프레이</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-6">고객지원</h4>
          <ul className="space-y-4">
            <li><Link to="/contact" className="hover:text-white transition-colors">견적 문의</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">A/S 신청</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">회사 소개</Link></li>
            <li><Link to="/admin" className="hover:text-white transition-colors">관리자 로그인</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-16 pt-8 border-t border-gray-800 text-sm text-center">
        © {new Date().getFullYear()} {config.siteName}. All rights reserved.
      </div>
    </div>
  </footer>
);

// --- Pages ---

const Home = ({ config, products }: { config: SiteConfig; products: Product[] }) => {
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, 150]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 30;
    const y = (clientY / innerHeight - 0.5) * 30;
    setMousePos({ x, y });
  };

  return (
    <div className="pt-20 overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden bg-white">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: yParallax,
            x: mousePos.x,
            translateY: mousePos.y
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=1920&q=80"
            alt="과자 자동화 생산 라인"
            className="w-full h-full object-cover opacity-30 scale-110 brightness-105 contrast-110 transition-opacity duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-900 uppercase bg-blue-50 rounded-full">
            Food Engineering Excellence
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
            식품 기계 제작의 명가
          </h1>
          <h2 className="text-5xl md:text-8xl font-black text-blue-900 leading-tight mb-8">
            세일엔지니어링
          </h2>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            {config.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="px-8 py-4 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all flex items-center justify-center group"
            >
              제품 보러가기
              <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 border border-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-all text-center"
            >
              견적 문의하기
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Features Section */}
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">왜 세일엔지니어링인가?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            수십 년간 쌓아온 기술력과 노하우로 고객사의 생산 효율성을 극대화합니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: Factory, title: '자체 제작 공정', desc: '설계부터 제작까지 전 과정을 직접 관리합니다.' },
            { icon: ShieldCheck, title: '철저한 품질관리', desc: '엄격한 테스트를 거친 제품만을 출고합니다.' },
            { icon: Clock, title: '신속한 A/S', desc: '전국 어디든 신속한 유지보수 서비스를 제공합니다.' },
            { icon: Utensils, title: '식품 안전 인증', desc: 'HACCP 기준에 부합하는 위생적인 설계를 지향합니다.' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-blue-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Featured Products */}
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">주요 제품 라인업</h2>
            <p className="text-gray-600">세일엔지니어링의 대표적인 식품 설비입니다.</p>
          </div>
          <Link to="/products" className="text-blue-900 font-semibold flex items-center hover:underline">
            전체보기 <ChevronRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.slice(0, 3).map((product) => (
            <Link key={product.id} to={`/products`} className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-6 bg-gray-100">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-bold text-blue-900 rounded-full shadow-sm">
                    {product.category}
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                {product.name}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="py-24 bg-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          귀사의 생산 라인을 혁신할 준비가 되셨나요?
        </h2>
        <p className="text-blue-100 text-lg mb-10 opacity-80">
          전문 엔지니어가 귀사의 요구사항에 최적화된 맞춤형 솔루션을 제안해 드립니다.
        </p>
        <Link
          to="/contact"
          className="inline-block px-10 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
        >
          지금 바로 문의하기
        </Link>
      </div>
    </section>
  </div>
  );
};

const ProductsPage = ({ products }: { products: Product[] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [filter, setFilter] = useState(categoryParam || '전체');
  const categories = ['전체', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    setFilter(categoryParam || '전체');
  }, [categoryParam]);

  const filteredProducts = filter === '전체' 
    ? products 
    : products.filter(p => p.category === filter);

  const handleFilterChange = (cat: string) => {
    setFilter(cat);
    if (cat === '전체') {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">제품 소개</h1>
          <p className="text-gray-600">세일엔지니어링의 고성능 식품 기계 라인업입니다.</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all",
                filter === cat 
                  ? "bg-blue-900 text-white shadow-md" 
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-8">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 block">
                  {product.category}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{product.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {product.description}
                </p>
                <div className="space-y-2">
                  {product.features.map((feature, i) => (
                    <div key={i} className="flex items-center text-xs text-gray-500">
                      <div className="w-1.5 h-1.5 bg-blue-900 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  to="/contact"
                  className="mt-8 block w-full py-3 text-center border border-blue-900 text-blue-900 font-bold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  견적 문의
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContactPage = ({ config }: { config: SiteConfig }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const SEIL_LOCATION = { lat: 37.7848, lng: 127.2348 };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const inquiryRef = doc(collection(db, 'inquiries'));
      await setDoc(inquiryRef, {
        ...form,
        createdAt: new Date().toISOString()
      });
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">고객센터</h1>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed">
              제품에 대한 궁금한 점이나 견적 문의가 있으시면 언제든 연락주세요.<br />
              전문 상담원이 친절하게 안내해 드립니다.
            </p>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">본사 위치</h4>
                  <p className="text-gray-600">{config.address}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">전화 번호</h4>
                  <p className="text-gray-600">{config.contactPhone}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">이메일 문의</h4>
                  <p className="text-gray-600">{config.contactEmail}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 md:p-12 rounded-3xl border border-gray-100">
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">문의가 접수되었습니다</h3>
                <p className="text-gray-600 mb-8">빠른 시일 내에 담당자가 연락드리겠습니다.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-8 py-3 bg-blue-900 text-white font-bold rounded-xl"
                >
                  추가 문의하기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">성함</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">연락처</label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">이메일</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
                    placeholder="example@mail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">문의 제목</label>
                  <input
                    required
                    type="text"
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
                    placeholder="견적 문의 드립니다"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">상세 내용</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="문의하실 내용을 입력해주세요"
                  />
                </div>
                <button
                  disabled={status === 'submitting'}
                  type="submit"
                  className="w-full py-4 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {status === 'submitting' ? '전송 중...' : '문의 보내기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Admin Dashboard ---

const AdminDashboard = ({ config, products, user }: { config: SiteConfig; products: Product[]; user: User | null }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'products' | 'inquiries'>('config');

  if (!user) {
    return (
      <div className="pt-40 pb-24 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">관리자 전용 페이지</h2>
          <p className="text-gray-600 mb-8">이 페이지에 접근하려면 관리자 계정으로 로그인해야 합니다.</p>
          <button
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl"
          >
            Google로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <button onClick={() => signOut(auth)} className="flex items-center text-gray-500 hover:text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> 로그아웃
          </button>
        </div>

        <div className="flex space-x-4 mb-8">
          {[
            { id: 'config', name: '사이트 설정' },
            { id: 'products', name: '제품 관리' },
            { id: 'inquiries', name: '문의 내역' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-2 rounded-lg font-bold transition-all",
                activeTab === tab.id ? "bg-blue-900 text-white" : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
          {activeTab === 'config' && <ConfigEditor config={config} />}
          {activeTab === 'products' && <ProductManager products={products} />}
          {activeTab === 'inquiries' && <InquiryViewer />}
        </div>
      </div>
    </div>
  );
};

const ConfigEditor = ({ config }: { config: SiteConfig }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'config', 'main'), localConfig);
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error(error);
      alert('권한이 없거나 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">회사명</label>
          <input
            type="text"
            value={localConfig.siteName}
            onChange={e => setLocalConfig({ ...localConfig, siteName: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">대표 이메일</label>
          <input
            type="text"
            value={localConfig.contactEmail}
            onChange={e => setLocalConfig({ ...localConfig, contactEmail: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">연락처</label>
          <input
            type="text"
            value={localConfig.contactPhone}
            onChange={e => setLocalConfig({ ...localConfig, contactPhone: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">팩스번호</label>
          <input
            type="text"
            value={localConfig.fax || ''}
            onChange={e => setLocalConfig({ ...localConfig, fax: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">대표자</label>
          <input
            type="text"
            value={localConfig.representative || ''}
            onChange={e => setLocalConfig({ ...localConfig, representative: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">주소</label>
          <input
            type="text"
            value={localConfig.address}
            onChange={e => setLocalConfig({ ...localConfig, address: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">메인 타이틀</label>
        <input
          type="text"
          value={localConfig.heroTitle}
          onChange={e => setLocalConfig({ ...localConfig, heroTitle: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-200"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">메인 서브타이틀</label>
        <textarea
          rows={3}
          value={localConfig.heroSubtitle}
          onChange={e => setLocalConfig({ ...localConfig, heroSubtitle: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-200"
        />
      </div>
      <button
        onClick={handleSave}
        className="px-8 py-3 bg-blue-900 text-white font-bold rounded-xl"
      >
        변경사항 저장
      </button>
    </div>
  );
};

const ProductManager = ({ products }: { products: Product[] }) => {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const handleSave = async () => {
    if (!editing?.name) return;
    try {
      const id = editing.id || doc(collection(db, 'products')).id;
      await setDoc(doc(db, 'products', id), { ...editing, id });
      setEditing(null);
      alert('제품이 저장되었습니다.');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold">제품 목록 ({products.length})</h3>
        <button
          onClick={() => setEditing({ name: '', category: '터널형 오븐', description: '', imageUrl: '', features: [] })}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-bold"
        >
          + 새 제품 추가
        </button>
      </div>

      {editing && (
        <div className="mb-12 p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="제품명"
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-200"
            />
            <input
              placeholder="카테고리"
              value={editing.category}
              onChange={e => setEditing({ ...editing, category: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <input
            placeholder="이미지 URL"
            value={editing.imageUrl}
            onChange={e => setEditing({ ...editing, imageUrl: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
          <textarea
            placeholder="설명"
            value={editing.description}
            onChange={e => setEditing({ ...editing, description: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200"
          />
          <div className="flex space-x-2">
            <button onClick={handleSave} className="px-6 py-2 bg-blue-900 text-white rounded-lg font-bold">저장</button>
            <button onClick={() => setEditing(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">취소</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {products.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <img src={p.imageUrl} className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
              <div>
                <div className="font-bold text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.category}</div>
              </div>
            </div>
            <button onClick={() => setEditing(p)} className="text-blue-900 font-bold text-sm">수정</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const InquiryViewer = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin(auth.currentUser)) return;
    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'inquiries'));
  }, []);

  return (
    <div className="space-y-4">
      {inquiries.map(inq => (
        <div key={inq.id} className="p-6 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded mb-2 inline-block">
                {new Date(inq.createdAt).toLocaleDateString()}
              </span>
              <h4 className="text-lg font-bold text-gray-900">{inq.subject}</h4>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="font-bold text-gray-900">{inq.name}</div>
              <div>{inq.phone}</div>
              <div>{inq.email}</div>
            </div>
          </div>
          <p className="text-gray-600 text-sm whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-50">
            {inq.message}
          </p>
        </div>
      ))}
      {inquiries.length === 0 && <div className="text-center py-12 text-gray-400">접수된 문의가 없습니다.</div>}
    </div>
  );
};

// --- Main App ---

const DEFAULT_CONFIG: SiteConfig = {
  siteName: '세일엔지니어링 주식회사',
  primaryColor: '#1e3a8a',
  secondaryColor: '#3b82f6',
  heroTitle: '식품 기계 제작의 명가, 세일엔지니어링',
  heroSubtitle: '최첨단 터널형 스틸밴드 오븐과 자동화 설비로 귀사의 생산 가치를 높여드립니다.',
  contactEmail: 'seil2013@hanmail.net',
  contactPhone: '031-534-6431',
  fax: '031-534-6432',
  representative: '김봉수',
  address: '경기도 포천시 내촌면 오림포1길 45-47',
};

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: '1',
    name: '고성능 STEEL BAND OVEN',
    category: 'STEEL BAND OVEN',
    description: '균일한 열전달과 에너지 효율을 극대화한 대형 터널 오븐입니다. 대량 생산 라인에 최적화되어 있습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000',
    features: ['디지털 온도 제어', '컨베이어 속도 조절', '스테인리스 위생 설계']
  },
  {
    id: '2',
    name: '산업용 벨트컨베이어 시스템',
    category: '벨트컨베이어',
    description: '안정적인 이송과 내구성을 자랑하는 벨트컨베이어입니다. 다양한 식품 생산 라인에 적용 가능합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1590604518089-283770413d6a?auto=format&fit=crop&q=80&w=1000',
    features: ['고출력 모터', '안전 센서 탑재', '이지 클리닝 시스템']
  },
  {
    id: '3',
    name: '정밀 샌딩머신',
    category: '샌딩머신',
    description: '제품 표면에 균일하게 샌딩 처리를 수행하는 자동화 기계입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=1000',
    features: ['PLC 제어 시스템', '맞춤형 금형 제작', '컴팩트한 공간 활용']
  },
  {
    id: '4',
    name: '오일 및 소금 스프레이 시스템',
    category: '오일스프레이, 소금스프레이',
    description: '제품 표면에 오일과 소금을 정밀하게 분사하여 맛과 품질을 높여주는 설비입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000',
    features: ['정밀 분사 노즐', '양 조절 시스템', '위생적인 스테인리스 재질']
  }
];

export default function App() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleAppError = useCallback((error: any) => {
    setGlobalError(error instanceof Error ? error.message : String(error));
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Listen for site config
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as SiteConfig);
      } else {
        // Only admin can initialize
        if (isAdmin(auth.currentUser)) {
          setDoc(doc(db, 'config', 'main'), DEFAULT_CONFIG).catch(e => handleAppError(e));
        }
      }
    }, (error) => handleAppError(error));

    // Listen for products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      if (snap.empty) {
        // Only admin can seed
        if (isAdmin(auth.currentUser)) {
          SAMPLE_PRODUCTS.forEach(p => setDoc(doc(db, 'products', p.id), p).catch(e => handleAppError(e)));
        }
      } else {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      }
      setLoading(false);
    }, (error) => handleAppError(error));

    return () => {
      unsubAuth();
      unsubConfig();
      unsubProducts();
    };
  }, [handleAppError]);

  if (globalError) {
    return <ErrorDisplay errorInfo={globalError} onReset={() => window.location.reload()} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
        <Navbar config={config} user={user} />
        <main>
          <Routes>
            <Route path="/" element={<Home config={config} products={products} />} />
            <Route path="/products" element={<ProductsPage products={products} />} />
            <Route path="/contact" element={<ContactPage config={config} />} />
            <Route path="/admin" element={<AdminDashboard config={config} products={products} user={user} />} />
            <Route path="/about" element={
              <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
                <h1 className="text-4xl font-bold mb-8">회사 소개</h1>
                <div className="prose prose-lg text-gray-600 leading-relaxed">
                  <div className="bg-blue-50/50 p-10 rounded-3xl mb-16 relative overflow-hidden border border-blue-100">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Quote className="w-32 h-32 text-blue-900" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-900 mb-8 flex items-center">
                      대표 인사
                    </h2>
                    <div className="space-y-6 text-gray-800 relative z-10">
                      <p className="font-semibold text-xl text-blue-950">저희 세일엔지니어링을 찾아주셔서 감사합니다.</p>
                      <p>
                        저희는 고객 한 분 한 분의 목소리에 귀 기울이며, 고객의 만족을 최우선 가치로 삼고 있습니다. 
                        오랜 경험을 통해 축적된 기술력은 물론, 철저한 사후 관리(A/S) 시스템으로 고객 여러분이 안심하고 기계를 사용하실 수 있도록 책임지겠습니다.
                      </p>
                      <p>
                        작은 인연도 소중히 여기며, 고객 여러분의 성공을 위한 최상의 파트너가 될 것을 약속드립니다. 
                        언제든 편하게 문의해주십시오. 감사합니다.
                      </p>
                      <div className="pt-8 flex flex-col items-end">
                        <p className="text-lg font-bold text-gray-900">세일엔지니어링 임직원 일동</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                    <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100">
                      <h3 className="text-blue-900 font-bold mb-4 flex items-center">
                        미션
                      </h3>
                      <p className="text-sm text-gray-800">혁신적인 기술로 전 세계 식품 산업의 생산 효율성을 높이고 안전한 먹거리 문화를 선도합니다.</p>
                    </div>
                    <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100">
                      <h3 className="text-blue-900 font-bold mb-4 flex items-center">
                        비전
                      </h3>
                      <p className="text-sm text-gray-800">글로벌 시장에서 인정받는 대한민국 대표 식품 설비 엔지니어링 기업으로 도약합니다.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 my-12">
                    <div className="lg:col-span-2">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">주요 연혁</h2>
                      <ul className="space-y-4 list-none p-0">
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">1990년</span>
                          <span className="text-sm">Sand machine 제작</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">1991년</span>
                          <span className="text-sm">필리핀 Rebsco 수출</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">1993년</span>
                          <span className="text-sm">크라운제과 - 죠리퐁 Line 설비 제작</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2006년</span>
                          <span className="text-sm">인도네시아 - Biscuit 라인 설비 수출</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2008년</span>
                          <span className="text-sm">베트남 쾅하이 - 샌드과자 생산 Plant 설비 수출</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2011년</span>
                          <span className="text-sm">인도네시아 - 롱파이 설비 수출</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2015년</span>
                          <span className="text-sm">미가방 유한회사 - 오레오 Sand 라인 설비 제작</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2016~2022년</span>
                          <span className="text-sm">Sand M/C 수출 및 청우식품 생산 Plant 설비</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2023년</span>
                          <span className="text-sm">크라운 - 죠리퐁 라인 설비 교체</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <span className="font-bold text-blue-900 w-28 shrink-0">2025년</span>
                          <span className="text-sm">청우식품 - 스틸 밴드 다이랙트 오븐 제작 및 납품</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-8 rounded-3xl h-fit border border-blue-100">
                      <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" />
                        특허 보유 현황
                      </h2>
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100">
                          <h4 className="font-bold text-gray-900 mb-1 leading-tight">Sand machine Part 특허 보유</h4>
                          <p className="text-blue-700 font-mono text-sm">제 10-2489978호</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </main>
        <Footer config={config} />
      </div>
    </Router>
  );
}
