'use client';

import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import styles from './Wishlist.module.css';

export default function WishlistPage() {
  const { productIds } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (productIds.length > 0) {
      setLoading(true);
      // Fetch products by IDs
      Promise.all(productIds.map(id => api.get(`/products/${id}`)))
        .then(responses => {
          setProducts(responses.map(res => res.data.data?.product || res.data.product));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [productIds, isAuthenticated, router]);

  if (loading) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Memuat Wishlist...
      </p>
    </div>
  );

  return (
    <div className={`container ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Wishlist Saya</h1>
        <p className={styles.meta}>
          {products.length} item tersimpan
        </p>
      </div>

      {!products.length ? (
        <div className={styles.empty}>
          <Heart size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Wishlist Kosong</h3>
          <p className={styles.emptyDesc}>
            Simpan produk favorit Anda untuk dilihat nanti.
          </p>
          <Link href="/products" className="btn-primary">
            Mulai Belanja <ShoppingBag size={16} />
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
