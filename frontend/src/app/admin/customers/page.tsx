'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Mail, Phone, Calendar, Eye, X, ShoppingBag } from 'lucide-react';
import styles from '../AdminUI.module.css';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/customers');
      setCustomers(data.data?.customers || data.customers || []);
    } catch {} finally { setLoading(false); }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Pelanggan</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
           <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
             {customers.length} Pelanggan Terdaftar
           </span>
        </div>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div style={{ flex: 1, display: 'flex' }}>
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="CARI NAMA / EMAIL..." 
            className={styles.searchInput} 
          />
          <div className={styles.searchBtn} style={{ cursor: 'default' }}>
            <Search size={16} />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>PELANGGAN</th>
              <th className={styles.th}>KONTAK</th>
              <th className={styles.th}>ORDER</th>
              <th className={styles.th}>TANGGAL GABUNG</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(null).map((_, i) => (
                <tr key={i} className={styles.tr}>
                  <td colSpan={6} className={styles.td}>
                    <div className="skeleton" style={{ height: '44px', width: '100%', borderRadius: '0' }} />
                  </td>
                </tr>
              ))
            ) : filteredCustomers.length === 0 ? (
              <tr className={styles.tr}>
                <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
                    TIDAK ADA DATA PELANGGAN DITEMUKAN
                  </div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '36px', height: '36px',
                        background: 'var(--color-text-primary)',
                        color: 'var(--color-bg-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '900',
                      }}>{c.name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>{c.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '700' }}>ID: {c.id.slice(-8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Mail size={12} className={styles.productMeta} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{c.email}</span>
                    </div>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={12} className={styles.productMeta} />
                        <span style={{ fontSize: '12px' }}>{c.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShoppingBag size={12} className={styles.productMeta} />
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{c._count?.orders ?? 0} order</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={12} className={styles.productMeta} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{formatDate(c.createdAt)}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${c.isActive ? styles.badgeSuccess : styles.badgeDanger}`} style={{ border: 'none', padding: '0' }}>
                      {c.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                      <button 
                        className={styles.iconBtn} 
                        title="DETAIL PELANGGAN"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setSelectedCustomer(null)}
        >
          <div 
            style={{
              background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
              width: '100%', maxWidth: '500px', padding: '0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
            }}>
              <h2 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detail Pelanggan
              </h2>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className={styles.iconBtn}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Avatar + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                  width: '56px', height: '56px',
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-bg-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: '900',
                }}>{selectedCustomer.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '700', marginTop: '2px' }}>
                    ID: {selectedCustomer.id.slice(-12).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{selectedCustomer.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Telepon</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{selectedCustomer.phone || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Order</span>
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>{selectedCustomer._count?.orders ?? 0} order</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tanggal Gabung</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{formatDate(selectedCustomer.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email Verified</span>
                  <span className={`${styles.badge} ${selectedCustomer.isEmailVerified ? styles.badgeSuccess : styles.badgeDanger}`} style={{ border: 'none', padding: '0' }}>
                    {selectedCustomer.isEmailVerified ? 'YA' : 'BELUM'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status Akun</span>
                  <span className={`${styles.badge} ${selectedCustomer.isActive ? styles.badgeSuccess : styles.badgeDanger}`} style={{ border: 'none', padding: '0' }}>
                    {selectedCustomer.isActive ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: '16px 24px', borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className={styles.actionBtn}
                style={{ fontSize: '11px' }}
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
