'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Product, Review } from '@/types';
import { formatPrice, getDiscountPercentage, getImageUrl } from '@/lib/utils';
import { Heart, ShoppingCart, Star, Plus, Minus, Share2, Check } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import ProductCard from '@/components/product/ProductCard';
import styles from './ProductDetail.module.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  
  const { addItem, openCart } = useCartStore();
  const { toggle, isWishlisted } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`).then(({ data }) => {
      const p = data.data?.product || data.product;
      setProduct(p);
      if (p?.category?.id) {
        api.get(`/products?category=${p.category.slug}&limit=4`).then(({ data: relData }) => {
          setRelatedProducts((relData.data?.products || relData.products || []).filter((item: Product) => item.id !== p.id));
        });
      }
    }).catch(() => {
      router.push('/products');
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Memuat Produk...
      </p>
    </div>
  );
  
  if (!product) return null;

  const wishlisted = isWishlisted(product.id);
  const discount = product.comparePrice ? getDiscountPercentage(Number(product.price), Number(product.comparePrice)) : 0;
  const images = product.images?.length ? product.images : [{ url: `https://picsum.photos/seed/${product.id}/600/600` }];

  const handleAddToCart = () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    addItem(product.id, quantity);
    openCart();
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    toggle(product.id);
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.layout}>
        {/* Gallery */}
        <div className={styles.gallery}>
          <div className={styles.mainImageContainer}>
            <img 
              src={getImageUrl(images[selectedImage].url)} 
              alt={product.name} 
              className={styles.mainImage}
            />
            {discount > 0 && <div className={styles.discountBadge}>-{discount}%</div>}
          </div>
          
          {images.length > 1 && (
            <div className={styles.thumbnailGrid}>
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`${styles.thumbnail} ${selectedImage === idx ? styles.thumbnailActive : ''}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={getImageUrl(img.url)} alt="" className={styles.thumbnailImg} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className={styles.info}>
          <span className={styles.category}>{product.category?.name || 'Koleksi'}</span>
          <h1 className={styles.title}>{product.name}</h1>
          
          {/* Rating Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  size={14} 
                  fill={i <= (product.avgRating || 0) ? 'var(--color-primary)' : 'none'}
                  color={i <= (product.avgRating || 0) ? 'var(--color-primary)' : 'var(--color-border)'}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
              {product.avgRating?.toFixed(1) || '0.0'} ({product._count?.reviews || 0} Ulasan)
            </span>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(Number(product.price))}</span>
            {product.comparePrice && (
              <span className={styles.comparePrice}>{formatPrice(Number(product.comparePrice))}</span>
            )}
          </div>

          <div className={styles.description}>
            {product.description || 'Tidak ada deskripsi untuk produk ini.'}
          </div>

          <div className={styles.actions}>
            <div className={styles.qtyRow}>
              <span className={styles.qtyLabel}>Kuantitas</span>
              <div className={styles.qtySelector}>
                <button 
                  className={styles.qtyBtn} 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button 
                  className={styles.qtyBtn} 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className={styles.stockInfo}>
                {product.stock > 0 ? (
                  <span style={{ color: 'var(--color-success)' }}>Stok Tersedia ({product.stock})</span>
                ) : (
                  <span style={{ color: 'var(--color-danger)' }}>Stok Habis</span>
                )}
              </span>
            </div>

            <div className={styles.mainBtns}>
              <button 
                className={`btn-primary ${styles.addBtn}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart size={18} style={{ marginRight: '10px' }} />
                Tambah ke Keranjang
              </button>
              <button 
                className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlistActive : ''}`}
                onClick={handleToggleWishlist}
              >
                <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                <Check size={14} /> Jaminan Original
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                <Check size={14} /> Pengiriman Aman
              </div>
            </div>
          </div>

          {/* Details & Specs */}
          <div className={styles.tabs}>
            <div className={styles.tabHeader}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'description' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Deskripsi
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'specs' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                Spesifikasi
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Ulasan ({product._count?.reviews || 0})
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'description' && (
                <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
                  {product.description || 'Tidak ada deskripsi mendalam untuk produk ini.'}
                </div>
              )}
              {activeTab === 'specs' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>SKU</div>
                  <div style={{ fontSize: '14px' }}>{product.sku || '-'}</div>
                  <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>Kategori</div>
                  <div style={{ fontSize: '14px' }}>{product.category?.name || '-'}</div>
                  <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>Berat</div>
                  <div style={{ fontSize: '14px' }}>{product.weight || '-'} g</div>
                </div>
              )}
              {activeTab === 'reviews' && (
                <div>
                   {product.reviews?.items?.length ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                       {product.reviews.items.map((review: Review) => (
                         <div key={review.id} style={{ paddingBottom: '32px', borderBottom: '1px solid var(--color-bg-secondary)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                             <div style={{ fontWeight: '700', fontSize: '14px' }}>{review.user?.name || 'User'}</div>
                             <div style={{ display: 'flex', gap: '2px' }}>
                               {[1, 2, 3, 4, 5].map((s) => (
                                 <Star key={s} size={12} fill={s <= review.rating ? 'var(--color-primary)' : 'none'} color={s <= review.rating ? 'var(--color-primary)' : 'var(--color-border)'} />
                               ))}
                             </div>
                           </div>
                           <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{review.comment}</p>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Belum ada ulasan untuk produk ini.</p>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div style={{ marginTop: '96px', borderTop: '1px solid var(--color-border)', paddingTop: '64px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '48px', letterSpacing: '-0.02em' }}>
            Produk Terkait
          </h2>
          <div className="product-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border)'
           }}>
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
