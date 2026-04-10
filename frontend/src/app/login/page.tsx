'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../Auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      toast.success('Login berhasil!');
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email atau password salah');
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
          <h1 className={styles.title}>LOG IN</h1>
          <p className={styles.subtitle}>Selamat datang kembali di GadgetPasaria.</p>
        </div>

        {error && (
          <div className={styles.error}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>EMAIL ADDRESS</label>
            <input
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com" 
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '40px' }}>
            <label className={styles.label}>PASSWORD</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
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

          <button type="submit" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? 'MEMPROSES...' : <>MASUK <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className={styles.footer}>
          Belum punya akun?{' '}
          <Link href="/register" className={styles.footerLink}>
            DAFTAR SEKARANG
          </Link>
        </div>

        
      </div>
    </div>
  );
}
