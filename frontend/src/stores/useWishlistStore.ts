'use client';
import { create } from 'zustand';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface WishlistStore {
  productIds: string[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  productIds: [],
  isLoading: false,

  fetchWishlist: async () => {
    try {
      const { data } = await api.get('/wishlist/ids');
      set({ productIds: data.data?.productIds || data.productIds || [] });
    } catch {
      // Not authenticated
    }
  },

  toggle: async (productId) => {
    const current = get().productIds;
    const isInWishlist = current.includes(productId);

    // Optimistic update
    if (isInWishlist) {
      set({ productIds: current.filter((id) => id !== productId) });
    } else {
      set({ productIds: [...current, productId] });
    }

    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/${productId}`);
        toast.success('Dihapus dari wishlist');
      } else {
        await api.post(`/wishlist/${productId}`);
        toast.success('Ditambahkan ke wishlist');
      }
    } catch (err: any) {
      // Rollback
      set({ productIds: current });
      toast.error(err.response?.data?.message || 'Gagal update wishlist');
    }
  },

  isWishlisted: (productId) => get().productIds.includes(productId),
}));
