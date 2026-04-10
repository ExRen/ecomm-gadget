'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate, getStatusLabel } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { ArrowLeft, Package, MapPin, CreditCard, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from '../../Account.module.css';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get(`/orders/${params.orderNumber}`).then(({ data }) => {
      setOrder(data.data?.order || data.order);
    }).catch(() => router.push('/account/orders')).finally(() => setLoading(false));
  }, [params.orderNumber, isAuthenticated, router]);

  const handleCancel = async () => {
    if (!order || !confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    try {
      await api.post(`/orders/${order.orderNumber}/cancel`, { reason: 'DIBATALKAN OLEH CUSTOMER' });
      toast.success('Pesanan dibatalkan');
      setOrder({ ...order, status: 'CANCELLED' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan');
    }
  };

  if (loading || !order) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Memuat Detail Pesanan...</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      <header style={{ marginBottom: '48px' }}>
        <Link 
          href="/account/orders" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            textDecoration: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '32px'
          }}
        >
          <ChevronLeft size={16} /> Kembali ke Daftar Pesanan
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--color-text-primary)', paddingBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.04em', textTransform: 'uppercase', lineHeight: '1' }}>
              ORDER #{order.orderNumber}
            </h1>
            <p style={{ marginTop: '12px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Dipesan pada {formatDate(order.createdAt)}
            </p>
          </div>
          <div style={{ 
            padding: '12px 24px', 
            border: '1px solid var(--color-text-primary)', 
            fontSize: '13px', 
            fontWeight: '900', 
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
           }}>
            {getStatusLabel(order.status)}
          </div>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '48px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {/* Order Items */}
          <section className={styles.card} style={{ padding: '0', border: 'none' }}>
            <h3 className={styles.cardTitle}>ITEMS PESANAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '24px', padding: '24px', background: 'var(--color-bg-primary)', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <img 
                      src={item.imageUrl || `https://picsum.photos/seed/${item.productId}/100/100`} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{item.productName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {item.quantity} x {formatPrice(Number(item.price))}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '900' }}>
                    {formatPrice(Number(item.subtotal))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery & Tracking */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle} style={{ marginBottom: '24px' }}>ALAMAT PENGIRIMAN</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.8', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>{order.address?.recipientName}</div>
                <div>{order.address?.phone}</div>
                <div>{order.address?.street}</div>
                <div>{order.address?.district}, {order.address?.city}</div>
                <div>{order.address?.province} {order.address?.postalCode}</div>
              </div>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle} style={{ marginBottom: '24px' }}>PELACAKAN</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.8', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                {order.trackingNumber ? (
                  <>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '4px' }}>NOMOR RESI</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{order.trackingNumber}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    BELUM ADA INFORMASI PELACAKAN.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <aside style={{ position: 'sticky', top: '120px' }}>
          <div className={styles.card} style={{ border: '1px solid var(--color-text-primary)' }}>
            <h3 className={styles.cardTitle} style={{ border: 'none', marginBottom: '24px' }}>RINGKASAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', fontWeight: '600' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>SUBTOTAL</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>ONGEKIR</span>
                <span>{formatPrice(Number(order.shippingCost))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                  <span>DISKON</span>
                  <span>-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid var(--color-text-primary)', paddingTop: '24px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '11px', fontWeight: '900' }}>TOTAL</span>
                <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.04em' }}>{formatPrice(Number(order.totalAmount))}</span>
              </div>
            </div>

            {order.status === 'PENDING_PAYMENT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px' }}>
                <button 
                  onClick={async () => {
                    try {
                      const { data } = await api.post(`/orders/${order.orderNumber}/retry-payment`);
                      const snapToken = data.data?.snapToken || data.snapToken;
                      if (!snapToken) {
                        toast.error('Gagal mendapatkan token pembayaran');
                        return;
                      }
                      if (typeof window !== 'undefined' && (window as any).snap) {
                        (window as any).snap.pay(snapToken, {
                          onSuccess: async () => {
                            try {
                              await api.post(`/orders/${order.orderNumber}/confirm-payment`);
                            } catch {}
                            toast.success('Pembayaran berhasil!');
                            setOrder({ ...order, status: 'PAID' });
                          },
                          onPending: () => {
                            toast.success('Menunggu pembayaran...');
                          },
                          onError: () => {
                            toast.error('Pembayaran gagal');
                          },
                          onClose: () => {
                            toast('Payment popup ditutup');
                          },
                        });
                      } else {
                        toast.error('Layanan pembayaran tidak tersedia');
                      }
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Gagal memproses pembayaran');
                    }
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-primary)',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textTransform: 'uppercase'
                  }}
                >
                  <CreditCard size={14} /> LANJUTKAN PEMBAYARAN
                </button>
                <button 
                  onClick={handleCancel} 
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textTransform: 'uppercase'
                  }}
                >
                  <X size={14} /> BATALKAN PESANAN
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
