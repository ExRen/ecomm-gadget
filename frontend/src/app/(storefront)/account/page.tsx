'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { User, ShoppingBag, MapPin, Heart, LogOut, Settings, User as UserIcon, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from './Account.module.css';

export default function AccountPage() {
  const { user, setUser, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user, isAuthenticated, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/me', { name, phone });
      setUser(data.data?.user || data.user);
      toast.success('Profil diperbarui');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/me/password', { oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      toast.success('Password diperbarui');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Berhasil keluar');
  };

  if (!user) return null;

  return (
    <div className={`container ${styles.container}`}>
      <h1 className={styles.title}>Akun Saya</h1>

      <div className={styles.layout}>
        {/* Navigation Sidebar */}
        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Personal</span>
            <Link href="/account" className={`${styles.navLink} ${styles.navLinkActive}`}>
              <UserIcon size={16} /> Profil
            </Link>
            <Link href="/account/addresses" className={styles.navLink}>
              <MapPin size={16} /> Alamat
            </Link>
          </div>
          
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Belanja</span>
            <Link href="/account/orders" className={styles.navLink}>
              <ShoppingBag size={16} /> Pesanan
            </Link>
            <Link href="/wishlist" className={styles.navLink}>
              <Heart size={16} /> Wishlist
            </Link>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} /> Keluar
          </button>
        </nav>

        {/* Main Content */}
        <main className={styles.main}>
          {/* Profile Card */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Informasi Profil</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Nama Lengkap</label>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    value={email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label className={styles.label}>Nomor Telepon</label>
                  <input
                    className={styles.input}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className={`btn-primary ${styles.saveBtn}`}
              >
                {loading ? 'Menyimpan...' : 'Update Profil'}
              </button>
            </form>
          </div>

          {/* Password Card */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Keamanan Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Password Lama</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Password Baru</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className={`btn-primary ${styles.saveBtn}`}
              >
                {loading ? 'Menyimpan...' : 'Ganti Password'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
