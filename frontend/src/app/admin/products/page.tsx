'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { Plus, Search, Eye, Edit, Trash2, Power, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '../AdminUI.module.css';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/products?${params}`);
      setProducts(data.data?.products || data.products || []);
      setMeta(data.data?.meta || data.meta);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/admin/products/${id}/toggle-active`);
      toast.success('Status produk diubah');
      fetchProducts();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Produk dihapus');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Manajemen Produk</h1>
        <Link href="/admin/products/new" className={styles.actionBtn}>
          <Plus size={16} /> TAMBAH PRODUK
        </Link>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex' }}>
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="CARI NAMA / SKU / KATEGORI..." 
            className={styles.searchInput} 
          />
          <button type="submit" className={styles.searchBtn}>
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Table List */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>PRODUK</th>
              <th className={styles.th}>SKU</th>
              <th className={styles.th}>HARGA</th>
              <th className={styles.th}>STOK</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(null).map((_, i) => (
                <tr key={i} className={styles.tr}>
                  <td colSpan={6} className={styles.td}>
                    <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '0' }} />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr className={styles.tr}>
                <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
                    TIDAK ADA DATA PRODUK DITEMUKAN
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.productCell}>
                      <img 
                        src={getImageUrl(p.images?.[0]?.url, `https://picsum.photos/seed/${p.sku}/100/100`)} 
                        alt="" 
                        className={styles.productImg} 
                      />
                      <div>
                        <div className={styles.productName}>{p.name}</div>
                        <div className={styles.productMeta}>{p.category?.name || 'TANPA KATEGORI'}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '11px' }}>{p.sku || '-'}</td>
                  <td className={styles.td}>
                    <span className={styles.price}>{formatPrice(Number(p.price))}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.stock} ${p.stock === 0 ? styles.badgeDanger : p.stock <= 5 ? styles.badgeWarning : ''}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${p.isActive ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {p.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleToggle(p.id)} 
                        className={styles.iconBtn} 
                        title="TOGGLE STATUS"
                      >
                        <Power size={14} />
                      </button>
                      <Link 
                        href={`/admin/products/${p.id}/edit`} 
                        className={styles.iconBtn} 
                        title="EDIT"
                      >
                        <Edit size={14} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                        title="DELETE"
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

      {/* Pagination */}
      {meta?.totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: meta.totalPages }, (_, i) => {
            const pNum = i + 1;
            return (
              <button 
                key={pNum} 
                onClick={() => setPage(pNum)} 
                className={`${styles.pageBtn} ${page === pNum ? styles.pageBtnActive : ''}`}
              >
                {pNum}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
