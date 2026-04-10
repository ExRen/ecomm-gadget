'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ReportSummary } from '@/types';
import {
  ShoppingCart, Package, Users,
  DollarSign, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from './Dashboard.module.css';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/reports/summary').then(({ data }) => {
      setSummary(data.data || data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = summary ? [
    { label: 'Pendapatan', value: formatPrice(summary.totalRevenue), icon: DollarSign },
    { label: 'Pesanan', value: String(summary.totalOrders), icon: ShoppingCart },
    { label: 'Produk', value: String(summary.totalProducts), icon: Package },
    { label: 'Pelanggan', value: String(summary.totalCustomers), icon: Users },
  ] : [];

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Ringkasan operasional GadgetPasaria</p>
      </header>

      {/* Stat Cards Grid */}
      <div className={styles.statsGrid}>
        {loading ? (
          Array(4).fill(null).map((_, i) => (
            <div key={i} className={styles.statCard}>
              <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '16px' }} />
              <div className="skeleton" style={{ height: '12px', width: '60%' }} />
            </div>
          ))
        ) : (
          stats.map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <stat.icon size={20} />
                </div>
                <ArrowUpRight size={14} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))
        )}
      </div>

      <div className={styles.chartsGrid}>
        {/* Revenue Chart */}
        <section className={styles.chartCard}>
          <h3 className={styles.cardTitle}>Pendapatan (30 HARI)</h3>
          {summary?.revenueByDay?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={summary.revenueByDay}>
                <CartesianGrid strokeDasharray="0" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }} 
                  tickFormatter={(v) => v.split('-').slice(1).join('/')}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }} 
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ 
                    background: 'var(--color-bg-primary)', 
                    border: '1px solid var(--color-text-primary)', 
                    borderRadius: '0',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                  cursor={{ stroke: 'var(--color-text-primary)', strokeWidth: 1 }}
                  formatter={(value: any) => [formatPrice(value), 'REVENUE']}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="revenue" 
                  stroke="var(--color-text-primary)" 
                  fill="var(--color-bg-secondary)" 
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyState}>DATABASE KOSONG</div>
          )}
        </section>

        {/* Top Products */}
        <section className={styles.chartCard} style={{ maxHeight: '420px', overflow: 'hidden' }}>
          <h3 className={styles.cardTitle}>Produk Terlaris</h3>
          {summary?.topProducts?.length ? (
            <div className={styles.productList}>
              {summary.topProducts.slice(0, 6).map((product, i) => (
                <div key={i} className={styles.productItem}>
                  <span className={styles.rank}>{i + 1}</span>
                  <div className={styles.productInfo}>
                    <div className={styles.productName}>{product.productName}</div>
                    <div className={styles.productSales}>{product._sum.quantity} TERJUAL</div>
                  </div>
                  <div className={styles.productRevenue}>
                    {formatPrice(Number(product._sum.subtotal))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>BELUM ADA DATA PENJUALAN</div>
          )}
        </section>
      </div>
    </div>
  );
}
