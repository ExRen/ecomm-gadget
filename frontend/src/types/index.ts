export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  avatarUrl?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  children?: Category[];
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  sku: string;
  stock: number;
  weight: number;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  category?: { id: string; name: string; slug: string };
  tags?: { tag: { id: string; name: string; slug: string } }[];
  avgRating?: number;
  _count?: { reviews: number; orderItems: number };
  reviews?: ProductReviews;
  createdAt: string;
}

export interface ProductReviews {
  avg: number;
  count: number;
  distribution: { rating: number; _count: number }[];
  items: Review[];
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: { id: string; name: string; avatarUrl?: string };
  product?: { id: string; name: string; slug: string };
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  cancelReason?: string;
  items: OrderItem[];
  payment?: Payment;
  address?: Address;
  user?: Partial<User>;
  voucher?: Voucher;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING'
  | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'FAILED';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
  product?: { slug: string };
}

export interface Payment {
  id: string;
  snapToken?: string;
  paymentMethod?: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  grossAmount: number;
  paidAt?: string;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { productId: string; productName: string; _sum: { quantity: number; subtotal: number } }[];
}
