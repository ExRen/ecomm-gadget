'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { Eye, EyeOff, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../Auth.module.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Password tidak cocok'); return; }
    if (form.password.length < 8) { setError('Password minimal 8 karakter'); return; }

    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Registrasi berhasil! Silakan login.');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registrasi gagal');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>G</div>
            <span className={styles.logoText}>GadgetPasaria</span>
          </Link>
          <h1 className={styles.title}>BUAT AKUN</h1>
          <p className={styles.subtitle}>Bergabunglah dengan komunitas GadgetPasaria.</p>
        </div>

        {error && (
          <div className={styles.error}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>NAMA LENGKAP</label>
            <input 
              type="text" 
              required 
              value={form.name} 
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
              placeholder="JOHN DOE" 
              className={styles.input} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              required 
              value={form.email} 
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} 
              placeholder="NAME@COMPANY.COM" 
              className={styles.input} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>NOMOR HP</label>
            <input 
              type="tel" 
              value={form.phone} 
              onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} 
              placeholder="0812XXXXXXXX" 
              className={styles.input} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>PASSWORD</label>
            <div className={styles.passwordWrapper}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="MIN. 8 KARAKTER" 
                className={styles.input}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className={styles.passwordToggle}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '40px' }}>
            <label className={styles.label}>KONFIRMASI PASSWORD</label>
            <input 
              type="password" 
              required 
              value={form.confirmPassword}
              onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="ULANGI PASSWORD" 
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? 'MEMPROSES...' : <>DAFTAR <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className={styles.footer}>
          Sudah punya akun?{' '}
          <Link href="/login" className={styles.footerLink}>
            MASUK SEKARANG
          </Link>
        </div>
      </div>
    </div>
  );
}
