'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Category } from '@/types';
import { ArrowLeft, Save, X, Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../../AdminUI.module.css';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    sku: '',
    categoryId: '',
    image: '',
    weight: '1000',
    isFeatured: false
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/admin/categories');
        setCategories(data.data?.categories || data.categories || []);
      } catch {}
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { image, ...payload } = form;
      await api.post('/admin/products', {
        ...payload,
        price: Number(form.price),
        stock: Number(form.stock),
        weight: Number(form.weight)
      });
      toast.success('Produk berhasil ditambahkan');
      router.push('/admin/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan produk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className={styles.iconBtn} title="KEMBALI">
            <ArrowLeft size={16} />
          </button>
          <h1 className={styles.title}>TAMBAH PRODUK BARU</h1>
        </div>
      </header>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label className={styles.label}>NAMA PRODUK</label>
              <input 
                type="text" 
                required 
                value={form.name} 
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className={styles.input}
                placeholder="NAMA PRODUK MINIMALIS..."
              />
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label}>DESKRIPSI LENGKAP</label>
              <textarea 
                required 
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className={styles.textarea}
                placeholder="CERITAKAN TENTANG PRODUK INI..."
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>HARGA (IDR)</label>
              <input 
                type="number" 
                required 
                value={form.price} 
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                className={styles.input}
                placeholder="100000"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>STOK AWAL</label>
              <input 
                type="number" 
                required 
                value={form.stock} 
                onChange={(e) => setForm(p => ({ ...p, stock: e.target.value }))}
                className={styles.input}
                placeholder="10"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>SKU / KODE PRODUK</label>
              <input 
                type="text" 
                required 
                value={form.sku} 
                onChange={(e) => setForm(p => ({ ...p, sku: e.target.value }))}
                className={styles.input}
                placeholder="SKU-XXX-001"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>BERAT (GRAM)</label>
              <input 
                type="number" 
                required 
                value={form.weight} 
                onChange={(e) => setForm(p => ({ ...p, weight: e.target.value }))}
                className={styles.input}
                placeholder="1000"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>KATEGORI</label>
              <select 
                required 
                value={form.categoryId} 
                onChange={(e) => setForm(p => ({ ...p, categoryId: e.target.value }))}
                className={styles.select}
              >
                <option value="">PILIH KATEGORI</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label}>URL GAMBAR PRODUK</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={form.image} 
                  onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))}
                  className={styles.input}
                  style={{ flex: 1 }}
                  placeholder="https://example.com/image.jpg"
                />
                <button type="button" className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
                  <Upload size={16} />
                </button>
              </div>
            </div>

            <div className={styles.formGroupFull}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.isFeatured} 
                  onChange={(e) => setForm(p => ({ ...p, isFeatured: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#0a0a1a' }}
                />
                <span className={styles.label}>TAMPILKAN DI HALAMAN UTAMA (FEATURED)</span>
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={loading} className={styles.actionBtn} style={{ flex: 1 }}>
              {loading ? 'MEMPROSES...' : <><Save size={16} /> SIMPAN PRODUK</>}
            </button>
            <button type="button" onClick={() => router.back()} className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
              <X size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
