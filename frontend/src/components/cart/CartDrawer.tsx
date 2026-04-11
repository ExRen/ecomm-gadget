'use client';

import { useCartStore } from '@/stores/useCartStore';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/navigation';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem } = useCartStore();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={closeCart} className={styles.overlay} />

      {/* Drawer */}
      <div className={styles.drawer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <ShoppingBag size={20} className={styles.countIcon} />
            <h3 className={styles.title}>Keranjang</h3>
            <span className={styles.count}>{cart?.itemCount || 0}</span>
          </div>
          <button onClick={closeCart} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {!cart?.items?.length ? (
            <div className={styles.emptyState}>
              <ShoppingBag size={64} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Keranjang kosong</p>
              <p className={styles.emptyDesc}>Yuk mulai belanja!</p>
            </div>
          ) : (
            <div className={styles.itemList}>
              {cart.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <img
                    src={getImageUrl(item.product.images?.[0]?.url, `https://picsum.photos/seed/${item.productId}/100/100`)}
                    alt={item.product.name}
                    className={styles.itemImage}
                  />
                  <div className={styles.itemContent}>
                    <h4 className={styles.itemName}>
                      {item.product.name}
                    </h4>
                    <p className={styles.itemPrice}>
                      {formatPrice(Number(item.product.price))}
                    </p>
                    <div className={styles.itemActions}>
                      <div className={styles.quantityGroup}>
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)} 
                          className={styles.qtyBtn}
                        >
                          <Minus size={12} />
                        </button>
                        <span className={styles.qtyValue}>
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)} 
                          className={styles.qtyBtn}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className={styles.removeBtn}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart?.items?.length ? (
          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Subtotal</span>
              <span className={styles.totalValue}>
                {formatPrice(cart.total)}
              </span>
            </div>
            <button
              onClick={() => {
                closeCart();
                window.location.href = '/checkout';
              }}
              className={`btn-primary ${styles.checkoutBtn}`}
            >
              Checkout <ArrowRight size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
