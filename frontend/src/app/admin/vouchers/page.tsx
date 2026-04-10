'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { Ticket, Plus, Trash2, Save, X, Calendar, Percent, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../AdminUI.module.css';

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', type: 'PERCENTAGE', value: 0,
    minPurchase: 0, maxDiscount: 0, usageLimit: 0,
    startDate: '', endDate: '',
  });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/vouchers');
      setVouchers(data.data?.vouchers || data.vouchers || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/vouchers', form);
      toast.success('Voucher berhasil ditambahkan');
      setShowForm(false);
      fetchVouchers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus voucher ini?')) return;
    try {
      await api.delete(`/admin/vouchers/${id}`);
      toast.success('Voucher dihapus');
      fetchVouchers();
    } catch { toast.error('Gagal menghapus'); }
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Voucher & Promo</h1>
        <button onClick={() => setShowForm(!showForm)} className={styles.actionBtn}>
          {showForm ? <><X size={16} /> TUTUP FORM</> : <><Plus size={16} /> TAMBAH VOUCHER</>}
        </button>
      </header>

      {showForm && (
        <section className={styles.tableContainer} style={{ padding: '32px', marginBottom: '32px' }}>
          <h3 className={styles.th} style={{ border: 'none', padding: '0 0 24px 0', fontSize: '13px' }}>BUAT VOUCHER BARU</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>KODE VOUCHER</label>
                <input 
                  type="text" 
                  required 
                  value={form.code} 
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>TIPE DISKON</label>
                <select 
                  value={form.type} 
                  onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)', height: '42px' }}
                >
                  <option value="PERCENTAGE">PERSENTASE (%)</option>
                  <option value="FIXED_AMOUNT">NOMINAL TETAP (IDR)</option>
                </select>
              </div>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>NILAI DISKON</label>
                <input 
                  type="number" 
                  required 
                  value={form.value} 
                  onChange={(e) => setForm(p => ({ ...p, value: Number(e.target.value) }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>MIN. BELANJA</label>
                <input 
                  type="number" 
                  value={form.minPurchase} 
                  onChange={(e) => setForm(p => ({ ...p, minPurchase: Number(e.target.value) }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>TANGGAL MULAI</label>
                <input 
                  type="date" 
                  required 
                  value={form.startDate} 
                  onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>TANGGAL BERAKHIR</label>
                <input 
                  type="date" 
                  required 
                  value={form.endDate} 
                  onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} 
                  className={styles.searchInput}
                  style={{ width: '100%', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className={styles.productMeta} style={{ display: 'block', marginBottom: '8px' }}>DESKRIPSI PROMO</label>
              <input 
                type="text" 
                required 
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                className={styles.searchInput}
                style={{ width: '100%', border: '1px solid var(--color-border)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className={styles.actionBtn} style={{ padding: '12px 40px' }}>
                <Save size={14} /> SIMPAN VOUCHER
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={styles.iconBtn} style={{ height: '42px', width: '42px' }}>
                <X size={16} />
              </button>
            </div>
          </form>
        </section>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>KODE</th>
              <th className={styles.th}>DESKRIPSI</th>
              <th className={styles.th}>DISKON</th>
              <th className={styles.th}>PENGGUNAAN</th>
              <th className={styles.th}>PERIODE</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(null).map((_, i) => (
                <tr key={i} className={styles.tr}>
                  <td colSpan={6} className={styles.td}>
                    <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '0' }} />
                  </td>
                </tr>
              ))
            ) : vouchers.length === 0 ? (
              <tr className={styles.tr}>
                <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
                    BELUM ADA VOUCHER DIBUAT
                  </div>
                </td>
              </tr>
            ) : (
              vouchers.map((v) => {
                const isActive = new Date(v.endDate) > new Date();
                return (
                  <tr key={v.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--color-primary)', fontSize: '14px' }}>{v.code}</span>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>{v.description}</div>
                      <div className={styles.productMeta}>MIN. BELANJA: {formatPrice(Number(v.minPurchase))}</div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                        {v.type === 'PERCENTAGE' ? <Percent size={14} /> : <Coins size={14} />}
                        {v.type === 'PERCENTAGE' ? `${Number(v.value)}%` : formatPrice(Number(v.value))}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontSize: '11px', fontWeight: '700' }}>
                        {v.usedCount} / {v.usageLimit || '∞'}
                      </div>
                      <div className={styles.productMeta}>KALI DIGUNAKAN</div>
                    </td>
                    <td className={styles.td}>
                      <div className={`${styles.badge} ${isActive ? styles.badgeSuccess : styles.badgeDanger}`} style={{ border: 'none', padding: '0', fontSize: '10px' }}>
                        {isActive ? 'BERLAKU' : 'EXPIRED'}
                      </div>
                      <div className={styles.productMeta} style={{ marginTop: '2px' }}>HINGGA {formatDate(v.endDate)}</div>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleDelete(v.id)} 
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                          title="HAPUS"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
