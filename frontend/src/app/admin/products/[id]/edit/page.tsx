'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Category, Product } from '@/types';
import { ArrowLeft, Save, X, Upload, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../../../AdminUI.module.css';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    sku: '',
    categoryId: '',
    image: '',
    weight: '',
    isFeatured: false,
    isActive: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/admin/categories'),
          api.get(`/admin/products/${id}`)
        ]);
        
        setCategories(catRes.data.data?.categories || catRes.data.categories || []);
        
        const prod = prodRes.data.data?.product || prodRes.data.product || prodRes.data;
        if (prod) {
          setForm({
            name: prod.name,
            description: prod.description || '',
            price: String(prod.price),
            stock: String(prod.stock),
            sku: prod.sku || '',
            categoryId: prod.categoryId || '',
            image: prod.image || '',
            weight: String(prod.weight || 0),
            isFeatured: prod.isFeatured || false,
            isActive: prod.isActive
          });
        }
      } catch (err) {
        toast.error('Gagal memuat data produk');
        router.push('/admin/products');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/products/${id}`, {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        weight: Number(form.weight)
      });
      toast.success('Produk berhasil diperbarui');
      router.push('/admin/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui produk');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'bold' }}>MEMUAT DATA...</p>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className={styles.iconBtn} title="KEMBALI">
            <ArrowLeft size={16} />
          </button>
          <h1 className={styles.title}>EDIT PRODUK</h1>
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
              />
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label}>DESKRIPSI LENGKAP</label>
              <textarea 
                required 
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className={styles.textarea}
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
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>STOK TERSEDIA</label>
              <input 
                type="number" 
                required 
                value={form.stock} 
                onChange={(e) => setForm(p => ({ ...p, stock: e.target.value }))}
                className={styles.input}
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
                />
                <button type="button" className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
                  <Upload size={16} />
                </button>
              </div>
              {form.image && (
                <div style={{ marginTop: '16px', border: '1px solid var(--color-border)', padding: '4px', width: 'fit-content' }}>
                  <img src={form.image} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <div className={styles.formGroupFull}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={form.isFeatured} 
                  onChange={(e) => setForm(p => ({ ...p, isFeatured: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#0a0a1a' }}
                />
                <span className={styles.label}>TAMPILKAN DI HALAMAN UTAMA (FEATURED)</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.isActive} 
                  onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#0a0a1a' }}
                />
                <span className={styles.label}>PRODUK AKTIF DI CATALOG</span>
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={saving} className={styles.actionBtn} style={{ flex: 1 }}>
              {saving ? 'MENYIMPAN...' : <><Save size={16} /> SIMPAN PERUBAHAN</>}
            </button>
            <button type="button" onClick={() => router.push('/admin/products')} className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
              <X size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
