'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { MapPin, Plus, Trash2, CheckCircle, Home, Briefcase, Map, ArrowLeft, Loader2, X, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from '../Account.module.css';

export default function AddressesPage() {
  const { isHydrated, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    label: '',
    recipientName: '',
    phone: '',
    street: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: false
  });

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/users/me/addresses');
      setAddresses(data.data?.addresses || data.addresses || []);
    } catch {
      toast.error('Gagal memuat daftar alamat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isHydrated) {
      fetchAddresses();
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/users/me/addresses', form);
      toast.success('Alamat berhasil ditambahkan');
      setShowForm(false);
      setForm({
        label: '',
        recipientName: '',
        phone: '',
        street: '',
        district: '',
        city: '',
        province: '',
        postalCode: '',
        isDefault: false
      });
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan alamat');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus alamat ini?')) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      toast.success('Alamat dihapus');
      fetchAddresses();
    } catch {
      toast.error('Gagal menghapus alamat');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.patch(`/users/me/addresses/${id}/default`);
      toast.success('Alamat utama diperbarui');
      fetchAddresses();
    } catch {
      toast.error('Gagal memperbarui alamat utama');
    }
  };

  if (!isHydrated || loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Link href="/account" className={styles.iconBtn} style={{ border: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className={styles.title} style={{ margin: 0 }}>Daftar Alamat</h1>
      </div>

      <div className={styles.layout}>
        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Personal</span>
            <Link href="/account" className={styles.navLink}>
              <Home size={16} /> Profil
            </Link>
            <Link href="/account/addresses" className={`${styles.navLink} ${styles.navLinkActive}`}>
              <MapPin size={16} /> Alamat
            </Link>
          </div>
          
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Belanja</span>
            <Link href="/account/orders" className={styles.navLink}>
              <Map size={16} /> Pesanan
            </Link>
            <Link href="/wishlist" className={styles.navLink}>
              <Heart size={16} /> Wishlist
            </Link>
          </div>
        </nav>

        <main className={styles.main}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 'bold' }}
            >
              {showForm ? 'BATAL' : <><Plus size={16} /> TAMBAH ALAMAT</>}
            </button>
          </div>

          {showForm && (
            <div className={styles.card} style={{ marginBottom: '32px', border: '2px solid var(--color-text-primary)' }}>
              <h3 className={styles.cardTitle}>Tambah Alamat Baru</h3>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.label}>Label Alamat</label>
                    <input 
                      required 
                      placeholder="Rumah / Kantor" 
                      className={styles.input}
                      value={form.label}
                      onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Nama Penerima</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.recipientName}
                      onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Nomor Telepon</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label}>Alamat Lengkap (Jalan)</label>
                    <textarea 
                      required 
                      className={styles.input} 
                      style={{ minHeight: '60px' }}
                      value={form.street}
                      onChange={e => setForm(p => ({ ...p, street: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Kecamatan</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.district}
                      onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Kota</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Provinsi</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.province}
                      onChange={e => setForm(p => ({ ...p, province: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Kode Pos</label>
                    <input 
                      required 
                      className={styles.input}
                      value={form.postalCode}
                      onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={form.isDefault}
                      onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Jadikan Alamat Utama</span>
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="btn-primary" 
                  style={{ marginTop: '24px', width: '100%' }}
                >
                  {submitting ? 'MEMPROSES...' : 'SIMPAN ALAMAT'}
                </button>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            {addresses.length === 0 ? (
              <div className={styles.card} style={{ textAlign: 'center', padding: '64px' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Belum ada alamat tersimpan.</p>
              </div>
            ) : (
              addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className={styles.card} 
                  style={{ 
                    borderLeft: addr.isDefault ? '4px solid var(--color-text-primary)' : '1px solid var(--color-border)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        background: 'var(--color-text-primary)', 
                        color: 'white', 
                        padding: '2px 8px',
                        letterSpacing: '0.05em'
                      }}>
                        {addr.label.toUpperCase()}
                      </span>
                      {addr.isDefault && (
                        <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '8px', color: 'var(--color-text-primary)' }}>
                          • ALAMAT UTAMA
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!addr.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(addr.id)}
                          className={styles.iconBtn} 
                          style={{ border: 'none', color: 'var(--color-text-muted)' }}
                          title="Set Utama"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button 
                         onClick={() => handleDelete(addr.id)}
                         className={styles.iconBtn} 
                         style={{ border: 'none', color: 'var(--color-danger)' }}
                         title="Hapus"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '4px' }}>{addr.recipientName}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>{addr.phone}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                    {addr.street}<br />
                    {addr.district}, {addr.city}, {addr.province}, {addr.postalCode}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
