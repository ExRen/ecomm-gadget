'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatPrice, formatDate, getStatusLabel } from '@/lib/utils';
import { ShoppingBag, ChevronRight, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'next/navigation';
import styles from '../Account.module.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get('/orders').then(({ data }) => {
      setOrders(data.data?.orders || data.orders || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (loading) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Memuat Pesanan...</p>
    </div>
  );

  return (
    <div className={`container ${styles.container}`}>
      <h1 className={styles.title}>Riwayat Pesanan</h1>
      
      <div className={styles.layout}>
        {/* Navigation Sidebar */}
        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Personal</span>
            <Link href="/account" className={styles.navLink}>Profil</Link>
            <Link href="/account/addresses" className={styles.navLink}>Alamat</Link>
          </div>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Belanja</span>
            <Link href="/account/orders" className={`${styles.navLink} ${styles.navLinkActive}`}>Pesanan</Link>
            <Link href="/wishlist" className={styles.navLink}>Wishlist</Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className={styles.main}>
          {!orders.length ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '80px 20px' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
              <h3 className={styles.cardTitle} style={{ border: 'none', justifyContent: 'center' }}>PESANAN BELUM ADA</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '32px' }}>
                Anda belum melakukan pembelian apapun.
              </p>
              <Link href="/products" className="btn-primary" style={{ padding: '14px 40px' }}>BELANJA SEKARANG</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {orders.map((order) => (
                <Link key={order.id} href={`/account/orders/${order.orderNumber}`} className={styles.card} style={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-text-primary)'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                 >
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '48px', height: '48px', 
                      background: 'var(--color-bg-secondary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                     }}>
                      {order.status === 'DELIVERED' ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '4px' }}>ORD #{order.orderNumber}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        {formatDate(order.createdAt)} • {order.items?.length || 0} ITEM
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800' }}>{formatPrice(Number(order.totalAmount))}</div>
                      <div style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        marginTop: '4px',
                        textTransform: 'uppercase',
                        color: order.status === 'PAID' ? 'var(--color-success)' : 'var(--color-text-muted)'
                      }}>
                        {getStatusLabel(order.status)}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--color-border)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
