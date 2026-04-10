'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Product, Category, PaginationMeta } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Products.module.css';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPage = Number(searchParams.get('page')) || 1;
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sortBy') || 'newest';
  const currentQuery = searchParams.get('q') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data.data?.categories || data.categories || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', '20');
    if (currentCategory) params.set('category', currentCategory);
    if (currentSort) params.set('sortBy', currentSort);
    if (currentQuery) params.set('q', currentQuery);
    if (currentMinPrice) params.set('minPrice', currentMinPrice);
    if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);

    api.get(`/products?${params.toString()}`).then(({ data }) => {
      setProducts(data.data?.products || data.products || []);
      setMeta(data.data?.meta || data.meta);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentPage, currentCategory, currentSort, currentQuery, currentMinPrice, currentMaxPrice]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) { params.set(key, value); } else { params.delete(key); }
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className={`container ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {currentQuery ? `Hasil: "${currentQuery}"` : currentCategory ? `${currentCategory}` : 'Semua Produk'}
        </h1>
        <p className={styles.meta}>
          {meta ? `${meta.total} produk ditemukan` : 'Memuat...'}
        </p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Filters - Desktop */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            {/* Categories */}
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Kategori</span>
              <button 
                onClick={() => updateFilter('category', '')} 
                className={`${styles.categoryBtn} ${!currentCategory ? styles.categoryActive : ''}`}
              >
                Semua Koleksi
              </button>
              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => updateFilter('category', cat.slug)} 
                  className={`${styles.categoryBtn} ${currentCategory === cat.slug ? styles.categoryActive : ''}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Price Range */}
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Rentang Harga</span>
              <div className={styles.priceInputs}>
                <input
                  type="number" 
                  placeholder="Min"
                  value={currentMinPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className={styles.priceInput}
                />
                <input
                  type="number" 
                  placeholder="Max"
                  value={currentMaxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className={styles.priceInput}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Products */}
        <main className={styles.main}>
          {/* Sort bar */}
          <div className={styles.toolbar}>
             <span className={styles.meta}>{products.length} Ditampilkan</span>
            <select
              value={currentSort}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className={styles.sortSelect}
            >
              <option value="newest">Terbaru</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="popular">Terlaris</option>
            </select>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className={styles.grid}>
              {Array(8).fill(null).map((_, i) => (
                <div key={i} style={{ background: 'var(--color-bg-card)', padding: '24px' }}>
                  <div className="skeleton" style={{ height: '260px', marginBottom: '24px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '90%', marginBottom: '16px' }} />
                  <div className="skeleton" style={{ height: '24px', width: '60%' }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <Search size={48} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Produk tidak ditemukan</p>
              <p className={styles.emptyDesc}>Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => updateFilter('page', String(currentPage - 1))}
                disabled={currentPage <= 1}
                className={styles.pageBtn}
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: meta.totalPages }, (_, i) => {
                const page = i + 1;
                return (
                  <button 
                    key={page} 
                    onClick={() => updateFilter('page', String(page))}
                    className={`${styles.pageBtn} ${currentPage === page ? styles.pageActive : ''}`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => updateFilter('page', String(currentPage + 1))}
                disabled={currentPage >= meta.totalPages}
                className={styles.pageBtn}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: '11px', 
          fontWeight: '700', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em' 
        }}>Memuat Katalog...</p>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
