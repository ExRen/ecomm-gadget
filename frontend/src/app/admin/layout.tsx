'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Star,
  BarChart3, Settings, LogOut, ChevronLeft, Ticket,
} from 'lucide-react';
import styles from './AdminLayout.module.css';

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Produk' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Pesanan' },
  { href: '/admin/customers', icon: Users, label: 'Pelanggan' },
  { href: '/admin/categories', icon: Tag, label: 'Kategori' },
  { href: '/admin/vouchers', icon: Ticket, label: 'Voucher' },
  { href: '/admin/reviews', icon: Star, label: 'Ulasan' },
  { href: '/admin/reports', icon: BarChart3, label: 'Laporan' },
  { href: '/admin/settings', icon: Settings, label: 'Pengaturan' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>G</div>
            <div>
              <div className={styles.logoText}>GadgetPasaria</div>
              <div className={styles.logoSub}>ADMIN PANEL</div>
            </div>
          </div>
          <Link href="/" className={styles.backLink}>
            <ChevronLeft size={16} />
          </Link>
        </div>

        {/* Menu */}
        <nav className={styles.menu}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${styles.menuLink} ${isActive ? styles.menuActive : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={14} /> <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
