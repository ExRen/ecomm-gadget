'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { 
  ArrowLeft, Package, Clock, CheckCircle, Truck, 
  XCircle, Receipt, User, Mail, Phone, MapPin, 
  CreditCard, ExternalLink, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../../AdminUI.module.css';

export default function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<any>(null);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/admin/orders/${orderNumber}`);
      setOrder(data.data?.order || data.order || data);
    } catch {
      toast.error('Gagal memuat detail pesanan');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status: newStatus });
      toast.success('Status pesanan diperbarui');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT': return <Clock size={16} />;
      case 'PAID': return <CheckCircle size={16} />;
      case 'PROCESSING': return <RefreshCw size={16} />;
      case 'SHIPPED': return <Truck size={16} />;
      case 'DELIVERED': return <Package size={16} />;
      case 'CANCELLED': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'bold' }}>LOADING_ORDER_DATA...</p>
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
          <h1 className={styles.title}>PESANAN: {order.orderNumber}</h1>
        </div>
        <div className={styles.actions}>
           <div className={styles.badge} style={{ fontSize: '11px', padding: '8px 16px' }}>
              {order.status}
           </div>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Buyer Info */}
        <div className={styles.card}>
          <h3 className={styles.label} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={14} /> INFORMASI PEMBELI
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className={styles.productMeta}>NAMA</div>
              <div style={{ fontWeight: 800, fontSize: '13px' }}>{order.user?.name}</div>
            </div>
            <div>
              <div className={styles.productMeta}>EMAIL</div>
              <div style={{ fontWeight: 700, fontSize: '12px' }}>{order.user?.email}</div>
            </div>
            <div>
              <div className={styles.productMeta}>KONTAK</div>
              <div style={{ fontWeight: 700, fontSize: '12px' }}>{order.user?.phone || '-'}</div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className={styles.card}>
          <h3 className={styles.label} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={14} /> ALAMAT PENGIRIMAN
          </h3>
          <div style={{ fontSize: '13px', lineHeight: '1.6', fontWeight: 600 }}>
             <div style={{ textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
               {order.address?.recipientName} ({order.address?.label})
             </div>
             <div>{order.address?.phone}</div>
             <div style={{ color: 'var(--color-text-muted)' }}>
               {order.address?.street}, {order.address?.district}, {order.address?.city}, {order.address?.province}
             </div>
             <div style={{ marginTop: '4px' }}>KODE POS: {order.address?.postalCode}</div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className={styles.card}>
          <h3 className={styles.label} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={14} /> PEMBAYARAN
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={styles.productMeta}>METODE</span>
              <span style={{ fontWeight: 800 }}>MIDTRANS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={styles.productMeta}>ORDER_ID</span>
              <span style={{ fontWeight: 700, fontSize: '11px' }}>{order.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
              <span className={styles.label}>TOTAL BAYAR</span>
              <span className={styles.price} style={{ fontSize: '18px' }}>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item List */}
      <div className={styles.tableContainer} style={{ marginTop: '24px' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>PRODUK</th>
              <th className={styles.th}>HARGA SATUAN</th>
              <th className={styles.th}>QTY</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any) => (
              <tr key={item.id} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.productCell}>
                    <img src={item.product?.image} alt="" className={styles.productImg} />
                    <div>
                      <div className={styles.productName}>{item.product?.name}</div>
                      <div className={styles.productMeta}>SKU: {item.product?.sku}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>{formatPrice(item.price)}</td>
                <td className={styles.td}>{item.quantity}</td>
                <td className={styles.td} style={{ textAlign: 'right', fontWeight: 800 }}>
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Actions (Status Update) */}
      <div className={styles.card} style={{ marginTop: '24px' }}>
        <h3 className={styles.label} style={{ marginBottom: '24px' }}>KELOLA STATUS PESANAN</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => handleUpdateStatus(s)}
              disabled={updating || order.status === s}
              className={styles.actionBtn}
              style={{ 
                background: order.status === s ? 'var(--color-text-primary)' : 'transparent',
                color: order.status === s ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-text-primary)',
                flex: 1,
                justifyContent: 'center',
                opacity: order.status === s ? 1 : 0.6
              }}
            >
              {getStatusIcon(s)} {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
