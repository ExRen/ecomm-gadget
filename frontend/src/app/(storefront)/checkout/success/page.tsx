'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Home } from 'lucide-react';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="container" style={{ padding: '80px 16px', textAlign: 'center', maxWidth: '600px' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
        background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>Pesanan Berhasil!</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '8px' }}>
        Terima kasih telah berbelanja di GadgetPasaria
      </p>
      {orderNumber && (
        <p style={{ color: 'var(--color-primary-light)', fontSize: '18px', fontWeight: '600', marginBottom: '32px' }}>
          No. Pesanan: {orderNumber}
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <Link href="/account/orders" className="btn-secondary" style={{ textDecoration: 'none' }}>
          <Package size={16} /> Lihat Pesanan
        </Link>
        <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Home size={16} /> Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>Memuat...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
