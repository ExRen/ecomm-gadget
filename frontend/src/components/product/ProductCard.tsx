import Link from 'next/link';
import { formatPrice, getDiscountPercentage, getImageUrl } from '@/lib/utils';
import { Product } from '@/types';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'next/navigation';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { toggle, isWishlisted } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const wishlisted = isWishlisted(product.id);

  const imageUrl = getImageUrl(product.images?.[0]?.url, `https://picsum.photos/seed/${product.sku || product.id}/400/400`);
  const discount = product.comparePrice ? getDiscountPercentage(Number(product.price), Number(product.comparePrice)) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    addItem(product.id);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    toggle(product.id);
  };

  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      {/* Image */}
      <div className={styles.imageContainer}>
        <img
          src={imageUrl}
          alt={product.name}
          className={styles.image}
        />

        {/* Discount badge */}
        {discount > 0 && (
          <div className={styles.discountBadge}>
            -{discount}%
          </div>
        )}

        {/* Wishlist button */}
        <button 
          onClick={handleToggleWishlist} 
          className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlistActive : ''}`}
        >
          <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className={styles.outOfStock}>
            Stok Habis
          </div>
        )}

        {/* Low stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className={styles.stockBadge}>
            Hanya Sisa {product.stock}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.category}>
          {product.category?.name || 'Uncategorized'}
        </div>
        <h3 className={styles.title}>
          {product.name}
        </h3>

        {/* Rating */}
        <div className={styles.rating}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star 
              key={i} 
              size={12}
              fill={i <= (product.avgRating || 0) ? 'var(--color-primary)' : 'none'}
              color={i <= (product.avgRating || 0) ? 'var(--color-primary)' : 'var(--color-border)'}
            />
          ))}
          <span className={styles.ratingText}>
            ({product._count?.reviews || 0})
          </span>
        </div>

        {/* Price & Add to cart */}
        <div className={styles.priceContainer}>
          <span className={styles.price}>
            {formatPrice(Number(product.price))}
          </span>
          {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
            <span className={styles.comparePrice}>
              {formatPrice(Number(product.comparePrice))}
            </span>
          )}
        </div>

        <button 
          onClick={handleAddToCart} 
          disabled={product.stock === 0} 
          className={styles.addBtn}
        >
          <ShoppingCart size={14} />
          {product.stock === 0 ? 'Stok Habis' : 'Tambah'}
        </button>
      </div>
    </Link>
  );
}
