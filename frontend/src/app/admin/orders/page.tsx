'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate, getStatusLabel } from '@/lib/utils';
import { Search, Eye, Filter } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '../AdminUI.module.css';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.data?.orders || data.orders || []);
      setMeta(data.data?.meta || data.meta);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: newStatus });
      toast.success('Status pesanan diperbarui');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal update status');
    }
  };

  const statuses = ['', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Manajemen Pesanan</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
           <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
             {orders.length} Total Pesanan
           </span>
        </div>
      </header>

      {/* Filters & Search */}
      <div className={styles.toolbar} style={{ flexDirection: 'column', gap: '0', background: 'transparent' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', width: '100%', background: 'var(--color-border)' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex' }}>
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="CARI NOMOR PESANAN / NAMA..." 
              className={styles.searchInput} 
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={16} />
            </button>
          </form>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)', borderTop: 'none' }}>
          {statuses.map((s) => (
            <button 
              key={s} 
              onClick={() => { setStatus(s); setPage(1); }} 
              className={`${styles.pageBtn} ${status === s ? styles.pageBtnActive : ''}`}
              style={{ width: 'auto', padding: '0 20px', borderRadius: '0', border: 'none' }}
            >
              {s ? getStatusLabel(s) : 'SEMUA PESANAN'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>NO. PESANAN</th>
              <th className={styles.th}>PELANGGAN</th>
              <th className={styles.th}>TOTAL</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th}>TANGGAL</th>
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
            ) : orders.length === 0 ? (
              <tr className={styles.tr}>
                <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
                    BELUM ADA PESANAN DITEMUKAN
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span style={{ fontWeight: '800', fontFamily: 'monospace' }}>#{order.orderNumber}</span>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {(order as any).user?.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {(order as any).user?.email}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.price}>{formatPrice(Number(order.totalAmount))}</span>
                  </td>
                  <td className={styles.td}>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      style={{ 
                        padding: '8px 12px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        border: '1px solid var(--color-border)', 
                        background: 'var(--color-bg-secondary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
                        <option key={s} value={s}>{getStatusLabel(s)}</option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.td} style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                      <Link 
                        href={`/admin/orders/${order.orderNumber}`} 
                        className={styles.iconBtn} 
                        title="LIHAT DETAIL"
                      >
                        <Eye size={14} />
                      </Link>
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
