'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import {
  Search, ShoppingCart, Heart, User, LogOut,
  ChevronDown, Package, LayoutDashboard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cart, openCart } = useCartStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const itemCount = cart?.itemCount || 0;

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.container}`}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>G</div>
          <span className={styles.logoText}>GadgetPasaria</span>
        </Link>

        <form onSubmit={handleSearch} className={`${styles.searchForm} hidden-mobile`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari produk..."
            className={`input ${styles.searchInput}`}
          />
          <button type="submit" className={styles.searchSubmit}>
            <Search size={18} />
          </button>
        </form>

        <div className={styles.actions}>
          <Link href="/wishlist" className={styles.iconBtn}>
            <Heart size={20} />
          </Link>

          <button onClick={openCart} className={styles.iconBtn}>
            <ShoppingCart size={20} />
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </button>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className={styles.userBtn}>
                <div className={styles.userAvatar}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className={`hidden-mobile ${styles.userName}`}>{user?.name?.split(' ')[0]}</span>
                <ChevronDown size={14} className="hidden-mobile" />
              </button>

              {showUserMenu && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownName}>{user?.name}</div>
                    <div className={styles.dropdownEmail}>{user?.email}</div>
                  </div>
                  
                  <Link href="/account" onClick={() => setShowUserMenu(false)} className={styles.dropdownItem}>
                    <User size={16} /> Profil Saya
                  </Link>
                  <Link href="/account/orders" onClick={() => setShowUserMenu(false)} className={styles.dropdownItem}>
                    <Package size={16} /> Pesanan Saya
                  </Link>

                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <Link href="/admin" onClick={() => setShowUserMenu(false)} className={styles.dropdownItem}>
                      <LayoutDashboard size={16} /> Admin Panel
                    </Link>
                  )}

                  <div className={styles.dropdownDivider}>
                    <button onClick={handleLogout} className={styles.dropdownItem} style={{ color: 'var(--color-danger)' }}>
                      <LogOut size={16} /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authGroup}>
              <Link href="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Masuk
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
