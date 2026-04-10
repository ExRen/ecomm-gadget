'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatPrice } from '@/lib/utils';
import { Address } from '@/types';
import {
  MapPin, CreditCard, ShieldCheck, Tag, ArrowLeft, Loader2, ShoppingBag, Truck, Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Checkout.module.css';

export default function CheckoutPage() {
  const { cart, fetchCart, clearCart } = useCartStore();
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherDesc, setVoucherDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchCart();
    api.get('/users/me/addresses').then(({ data }) => {
      const addrs = data.data?.addresses || data.addresses || [];
      setAddresses(addrs);
      const def = addrs.find((a: Address) => a.isDefault);
      if (def) setSelectedAddress(def.id);
      else if (addrs.length) setSelectedAddress(addrs[0].id);
    }).catch(() => {});
    api.get('/settings/shipping').then(({ data }) => {
      const cost = data.data?.shippingCost ?? data.shippingCost ?? 15000;
      setShippingCost(cost);
    }).catch(() => setShippingCost(15000));
  }, [isAuthenticated]);

  const subtotal = cart?.total || 0;
  const totalAmount = subtotal - voucherDiscount + shippingCost;

  const handleValidateVoucher = async () => {
    if (!voucherCode) return;
    setValidatingVoucher(true);
    try {
      const { data } = await api.post('/vouchers/validate', {
        code: voucherCode,
        totalAmount: subtotal,
      });
      const v = data.data?.voucher || data.voucher;
      setVoucherDiscount(v.discountAmount);
      setVoucherDesc(v.description);
      toast.success(`Voucher diterapkan! Diskon ${formatPrice(v.discountAmount)}`);
    } catch (err: any) {
      setVoucherDiscount(0);
      setVoucherDesc('');
      toast.error(err.response?.data?.message || 'Voucher tidak valid');
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) { toast.error('Pilih alamat pengiriman'); return; }
    if (!cart?.items?.length) { toast.error('Keranjang kosong'); return; }

    setLoading(true);
    try {
      // Create order
      const { data: orderData } = await api.post('/orders', {
        addressId: selectedAddress,
        fromCart: true,
        voucherCode: voucherDiscount > 0 ? voucherCode : undefined,
        shippingMethod: 'STANDARD',
        notes,
      });
      const order = orderData.data?.order || orderData.order;
      const snapToken = orderData.data?.snapToken || orderData.snapToken;

      if (snapToken && snapToken.startsWith('mock-snap-')) {
        // Confirm payment on backend
        await api.post(`/orders/${order.orderNumber}/confirm-payment`);
        toast.success('Pesanan berhasil dibuat! (Mode Development)');
        clearCart();
        router.push(`/checkout/success?order=${order.orderNumber}`);
        return;
      }

      // Production: Use Midtrans Snap
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            try {
              await api.post(`/orders/${order.orderNumber}/confirm-payment`);
            } catch {}
            toast.success('Pembayaran berhasil!');
            clearCart();
            router.push(`/checkout/success?order=${order.orderNumber}`);
          },
          onPending: () => {
            toast.success('Menunggu pembayaran...');
            clearCart();
            router.push(`/account/orders/${order.orderNumber}`);
          },
          onError: () => {
            toast.error('Pembayaran gagal');
            router.push(`/checkout/failed?order=${order.orderNumber}`);
          },
          onClose: () => {
            toast('Payment popup ditutup');
          },
        });
      } else {
        // Fallback or warning if snap is not loaded
        toast.error('Gagal menghubungkan ke layanan pembayaran. Silakan coba lagi.');
        console.error('Midtrans Snap SDK not found');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  if (!cart?.items?.length && !loading) {
    return (
      <div className={`container ${styles.container}`} style={{ textAlign: 'center' }}>
        <h2 className={styles.summaryTitle}>Keranjang Kosong</h2>
        <p className={styles.addressText} style={{ marginBottom: '32px' }}>Tambahkan produk ke keranjang untuk checkout</p>
        <button onClick={() => router.push('/products')} className="btn-primary">Belanja Sekarang</button>
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      <button onClick={() => router.back()} className={styles.backBtn}>
        <ArrowLeft size={14} /> Kembali ke Koleksi
      </button>

      <h1 className={styles.title}>Konfirmasi Checkout</h1>

      <div className={styles.layout}>
        {/* Left: Details */}
        <div className={styles.main}>
          {/* Address Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <MapPin size={16} /> Alamat Pengiriman
            </h3>
            <div className={styles.addressList}>
              {addresses.length === 0 ? (
                <div className={styles.card} style={{ textAlign: 'center', padding: '40px' }}>
                  <p className={styles.addressText} style={{ marginBottom: '16px' }}>Belum ada alamat tersimpan.</p>
                  <button onClick={() => router.push('/account/addresses')} className="btn-secondary">Tambah Alamat</button>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div 
                    key={addr.id} 
                    className={`${styles.addressItem} ${selectedAddress === addr.id ? styles.addressActive : ''}`}
                    onClick={() => setSelectedAddress(addr.id)}
                  >
                    <input
                      type="radio"
                      className={styles.addressRadio}
                      checked={selectedAddress === addr.id}
                      readOnly
                    />
                    <div>
                      <div className={styles.addressLabel}>
                        {addr.label} — {addr.recipientName}
                      </div>
                      <div className={styles.addressText}>
                        {addr.street}, {addr.district}, {addr.city}, {addr.province} {addr.postalCode}
                      </div>
                      <div className={styles.addressText} style={{ marginTop: '8px', fontWeight: '700', fontSize: '12px' }}>
                        {addr.phone}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Package size={16} /> Rincian Item
            </h3>
            <div className={styles.orderItems}>
              {cart?.items?.map((item) => (
                <div key={item.id} className={styles.item}>
                  <img
                    src={item.product.images?.[0]?.url || `https://picsum.photos/seed/${item.productId}/100/100`}
                    alt={item.product.name}
                    className={styles.itemImage}
                  />
                  <div style={{ flex: 1 }}>
                    <div className={styles.itemName}>{item.product.name}</div>
                    <div className={styles.itemMeta}>
                      {item.quantity} x {formatPrice(Number(item.product.price))}
                    </div>
                  </div>
                  <div className={styles.itemPrice}>
                    {formatPrice(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div style={{ marginTop: '32px' }}>
              <span className={styles.addressLabel}>Catatan Pesanan</span>
              <textarea
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan khusus untuk pengiriman..."
                className="input" 
                style={{ 
                  marginTop: '12px', 
                  minHeight: '80px', 
                  resize: 'none', 
                  borderRadius: '0', 
                  border: '1px solid var(--color-border)' 
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Summary Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Ringkasan</h3>

            <div className={styles.voucherGroup}>
              <span className={styles.addressLabel}>Kode Promo</span>
              <div className={styles.voucherInputGroup} style={{ marginTop: '8px' }}>
                <input
                  value={voucherCode} 
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="KODE PROMO" 
                  className={styles.voucherInput}
                />
                <button 
                  onClick={handleValidateVoucher} 
                  disabled={validatingVoucher || !voucherCode} 
                  className={styles.voucherBtn}
                >
                  {validatingVoucher ? '...' : 'CEK'}
                </button>
              </div>
              {voucherDesc && (
                <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: '700', marginTop: '12px', textTransform: 'uppercase' }}>
                  ✓ {voucherDesc}
                </div>
              )}
            </div>

            <div className={styles.totalTable}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Subtotal</span>
                <span className={styles.totalValue}>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Pengiriman</span>
                <span className={styles.totalValue}>{formatPrice(shippingCost)}</span>
              </div>
              {voucherDiscount > 0 && (
                <div className={styles.totalRow} style={{ color: 'var(--color-success)' }}>
                  <span className={styles.totalLabel}>Diskon</span>
                  <span className={styles.totalValue}>-{formatPrice(voucherDiscount)}</span>
                </div>
              )}
              
              <div className={styles.grandTotal}>
                <span className={styles.grandTotalLabel}>Total</span>
                <span className={styles.grandTotalValue}>
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={loading || !selectedAddress} 
              className={`btn-primary ${styles.payBtn}`}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Memproses...</>
              ) : (
                <><CreditCard size={18} /> Bayar Sekarang</>
              )}
            </button>

            <div className={styles.secureInfo}>
              <ShieldCheck size={14} /> Keamanan Terjamin
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
