'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Product, Category } from '@/types';
import { formatPrice } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import { ArrowRight, Sparkles, ShieldCheck, Truck, CreditCard, Star } from 'lucide-react';
import styles from './Home.module.css';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products/featured'),
          api.get('/categories'),
        ]);
        setFeaturedProducts(productsRes.data.data?.products || productsRes.data.products || []);
        setFeaturedProducts(productsRes.data.data?.products || productsRes.data.products || []);
        setCategories(categoriesRes.data.data?.categories || categoriesRes.data.categories || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const trustItems = [
    { icon: ShieldCheck, title: 'Jaminan Orisinal', desc: '100% produk asli & resmi' },
    { icon: Truck, title: 'Gratis Ongkir', desc: 'Seluruh Indonesia' },
    { icon: CreditCard, title: 'Pembayaran Aman', desc: 'Proteksi penuh Midtrans' },
    { icon: Star, title: 'Garansi Resmi', desc: 'Klaim mudah & terpercaya' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <Sparkles size={14} /> Inovasi Teknologi Terkini
            </div>

            <h1 className={styles.title}>
              Upgrade Teknologimu <br /> ke Level <br /> Selanjutnya
            </h1>

            <p className={styles.description}>
              Dapatkan deretan gadget terbaru dari Apple, Samsung, dan brand ternama lainnya. Jaminan garansi resmi, produk 100% original, dan pembayaran aman melalui Midtrans.
            </p>

            <div className={styles.ctaGroup}>
              <Link href="/products" className="btn-primary" style={{ padding: '16px 40px', fontSize: '15px' }}>
                Mulai Belanja <ArrowRight size={18} />
              </Link>
              <Link href="/products?sortBy=popular" className="btn-secondary" style={{ padding: '16px 40px', fontSize: '15px' }}>
                Lihat Terlaris
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className={styles.trustSection}>
        <div className="container">
          <div className={styles.trustGrid}>
            {trustItems.map((item, i) => (
              <div key={i} className={styles.trustItem}>
                <div className={styles.trustItemIcon}>
                  <item.icon size={20} />
                </div>
                <div>
                  <div className={styles.trustTitle}>{item.title}</div>
                  <div className={styles.trustDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Kategori Pilihan</h2>
              <p className={styles.sectionDesc}>Temukan produk berdasarkan kategori favoritmu</p>
            </div>
            <Link href="/products" className={styles.viewAll}>
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.categoryGrid}>
            {(loading ? Array(8).fill(null) : categories.slice(0, 10)).map((cat, i) => (
              <Link
                key={cat?.id || i}
                href={cat ? `/products?category=${cat.slug}` : '#'}
                className={styles.categoryCard}
              >
                {loading ? (
                  <>
                    <div className="skeleton" style={{ width: '40px', height: '40px', marginBottom: '20px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '80%' }} />
                    <div className="skeleton" style={{ height: '11px', width: '40%', marginTop: '4px' }} />
                  </>
                ) : (
                  <>
                    <div className={styles.categoryIcon}>
                      {cat?.name?.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.categoryName}>{cat?.name}</div>
                      <div className={styles.categoryCount}>{cat?._count?.products || 0} produk</div>
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Produk Unggulan</h2>
              <p className={styles.sectionDesc}>Pilihan terbaik dari kurator kami</p>
            </div>
            <Link href="/products" className={styles.viewAll}>
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="product-grid" style={{ gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
              {Array(8).fill(null).map((_, i) => (
                <div key={i} style={{ background: 'var(--color-bg-card)', padding: '24px' }}>
                  <div className="skeleton" style={{ height: '260px', marginBottom: '24px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '90%', marginBottom: '16px' }} />
                  <div className="skeleton" style={{ height: '24px', width: '60%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="product-grid" style={{ gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.banner}>
            <h2 className={styles.bannerTitle}>
              Upgrade ke Gadget Impian <br /> dengan Promo Eksklusif
            </h2>
            <p className={styles.bannerText}>
              Gunakan kode voucher <span className={styles.bannerVoucher}>TECHDEAL</span> saat checkout untuk menikmati potongan harga khusus produk Apple dan Samsung pilihan.
            </p>
            <Link href="/register" className="btn-primary" style={{ padding: '20px 48px', fontSize: '16px', background: 'var(--color-bg-primary)', color: 'var(--color-primary)' }}>
              Miliki Sekarang <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
