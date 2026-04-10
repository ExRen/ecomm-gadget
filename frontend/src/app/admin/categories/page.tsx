'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Category } from '@/types';
import { Tag, Plus, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../AdminUI.module.css';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/categories');
      setCategories(data.data?.categories || data.categories || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/categories', form);
      toast.success('Kategori berhasil ditambahkan');
      setShowForm(false);
      setForm({ name: '', description: '' });
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Kategori dihapus');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Kategori Produk</h1>
        <button onClick={() => setShowForm(!showForm)} className={styles.actionBtn}>
          {showForm ? <><X size={16} /> TUTUP FORM</> : <><Plus size={16} /> TAMBAH KATEGORI</>}
        </button>
      </header>

      {showForm && (
        <section className={styles.tableContainer} style={{ padding: '32px', marginBottom: '32px' }}>
          <h3 className={styles.th} style={{ border: 'none', padding: '0 0 24px 0', fontSize: '13px' }}>DATA KATEGORI BARU</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>NAMA KATEGORI</label>
              <input 
                type="text" 
                required 
                value={form.name} 
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                className={styles.searchInput}
                style={{ width: '100%', border: '1px solid var(--color-border)' }}
              />
            </div>
            <div>
              <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>DESKRIPSI (OPSIONAL)</label>
              <input 
                type="text" 
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                className={styles.searchInput}
                style={{ width: '100%', border: '1px solid var(--color-border)' }}
              />
            </div>
            <button type="submit" className={styles.actionBtn} style={{ padding: '12px 32px' }}>
              <Save size={14} /> SIMPAN
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
              <X size={16} />
            </button>
          </form>
        </section>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>NAMA KATEGORI</th>
              <th className={styles.th}>SLUG</th>
              <th className={styles.th}>JUMLAH PRODUK</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(null).map((_, i) => (
                <tr key={i} className={styles.tr}>
                  <td colSpan={4} className={styles.td}>
                    <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '0' }} />
                  </td>
                </tr>
              ))
            ) : categories.length === 0 ? (
              <tr className={styles.tr}>
                <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
                    BELUM ADA KATEGORI DITEMUKAN
                  </div>
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '13px' }}>{cat.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {cat.description || 'TIDAK ADA DESKRIPSI'}
                    </div>
                  </td>
                  <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '11px' }}>{cat.slug}</td>
                  <td className={styles.td}>
                    <span style={{ fontWeight: '700' }}>{cat._count?.products || 0}</span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                      <button 
                         onClick={() => handleDelete(cat.id)} 
                         className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                         title="HAPUS"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
