'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Review } from '@/types';
import { Star, Check, X, Trash2, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import styles from '../AdminUI.module.css';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/admin/reviews${params}`);
      setReviews(data.data?.reviews || data.reviews || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [status]);

  const handleApprove = async (id: string) => {
    try { await api.patch(`/admin/reviews/${id}/approve`); toast.success('Ulasan disetujui'); fetchReviews(); }
    catch { toast.error('Gagal'); }
  };

  const handleReject = async (id: string) => {
    try { await api.patch(`/admin/reviews/${id}/reject`); toast.success('Ulasan ditolak'); fetchReviews(); }
    catch { toast.error('Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus ulasan ini?')) return;
    try { await api.delete(`/admin/reviews/${id}`); toast.success('Ulasan dihapus'); fetchReviews(); }
    catch { toast.error('Gagal'); }
  };

  const tabs = [
    { k: '', l: 'SEMUA ULASAN' },
    { k: 'PENDING', l: 'PERLU MODERASI' },
    { k: 'APPROVED', l: 'DISETUJUI' },
    { k: 'REJECTED', l: 'DITOLAK' }
  ];

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Moderasi Ulasan</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
           <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
             {reviews.length} Ulasan Terkumpul
           </span>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.pagination} style={{ justifyContent: 'flex-start', border: '1px solid var(--color-border)', margin: '0 0 32px 0', background: 'var(--color-border)', gap: '1px' }}>
        {tabs.map((t) => (
          <button 
            key={t.k} 
            onClick={() => setStatus(t.k)} 
            className={`${styles.pageBtn} ${status === t.k ? styles.pageBtnActive : ''}`}
            style={{ width: 'auto', padding: '0 20px', borderRadius: '0', border: 'none' }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {loading ? (
          Array(4).fill(null).map((_, i) => (
            <div key={i} className={styles.tableContainer} style={{ padding: '24px' }}>
              <div className="skeleton" style={{ height: '100px', width: '100%', borderRadius: '0' }} />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className={styles.tableContainer} style={{ gridColumn: '1 / -1', padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)' }}>
              TIDAK ADA ULASAN DITEMUKAN
            </div>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={styles.tableContainer} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{review.user?.name}</div>
                  <div className={styles.productMeta} style={{ fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    PRODUK: {review.product?.name}
                  </div>
                  <div className={styles.productMeta} style={{ fontSize: '9px', marginTop: '2px' }}>
                    {formatDate(review.createdAt)}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '2px', marginTop: '12px' }}>
                    {[1,2,3,4,5].map((i) => (
                      <Star 
                        key={i} 
                        size={12} 
                        fill={i <= review.rating ? 'var(--color-text-primary)' : 'none'} 
                        color={i <= review.rating ? 'var(--color-text-primary)' : 'var(--color-border)'} 
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.actions}>
                  {review.status === 'PENDING' && (
                    <>
                      <button 
                         onClick={() => handleApprove(review.id)} 
                         className={styles.iconBtn} 
                         style={{ color: 'var(--color-success)' }}
                         title="SETUJUI"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                         onClick={() => handleReject(review.id)} 
                         className={styles.iconBtn} 
                         style={{ color: 'var(--color-danger)' }}
                         title="TOLAK"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleDelete(review.id)} 
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                    title="HAPUS"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {review.comment && (
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--color-bg-secondary)', 
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.6',
                  fontStyle: 'italic'
                }}>
                  "{review.comment}"
                </div>
              )}
              
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                 <span className={`${styles.badge} ${review.status === 'APPROVED' ? styles.badgeSuccess : review.status === 'REJECTED' ? styles.badgeDanger : styles.badgeWarning}`} style={{ fontSize: '9px', border: 'none', padding: '0' }}>
                   {review.status}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
