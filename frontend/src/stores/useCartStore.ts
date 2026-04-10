'use client';
import { create } from 'zustand';
import { Cart, CartItem } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CartStore {
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  itemCount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()((set, get) => ({
  cart: null,
  isOpen: false,
  isLoading: false,

  fetchCart: async () => {
    try {
      const { data } = await api.get('/cart');
      set({ cart: data.data?.cart || data.cart });
    } catch {
      // Not authenticated or error
    }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data.data?.cart || data.cart, isOpen: true });
      toast.success('Ditambahkan ke keranjang');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan ke keranjang');
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (productId, quantity) => {
    try {
      const { data } = await api.patch(`/cart/items/${productId}`, { quantity });
      set({ cart: data.data?.cart || data.cart });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal update kuantitas');
    }
  },

  removeItem: async (productId) => {
    try {
      const { data } = await api.delete(`/cart/items/${productId}`);
      set({ cart: data.data?.cart || data.cart });
      toast.success('Item dihapus dari keranjang');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus item');
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart');
      set({ cart: null });
    } catch {
      // Ignore
    }
  },

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  itemCount: () => get().cart?.itemCount || 0,
  total: () => get().cart?.total || 0,
}));
