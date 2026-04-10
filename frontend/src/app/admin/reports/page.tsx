'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { BarChart3, Package, AlertTriangle, TrendingUp, ShoppingBag } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from '../AdminUI.module.css';

export default function AdminReportsPage() {
  const [orderReport, setOrderReport] = useState<any[]>([]);
  const [productReport, setProductReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/reports/orders?groupBy=day'),
      api.get('/admin/reports/products'),
    ]).then(([ordersRes, productsRes]) => {
      setOrderReport(ordersRes.data.data?.data || ordersRes.data.data || []);
      setProductReport(productsRes.data.data || productsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Analitik & Laporan</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
           <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
             Data 30 Hari Terakhir
           </span>
        </div>
      </header>

      {/* Order chart */}
      <section className={styles.tableContainer} style={{ padding: '32px', marginBottom: '48px' }}>
        <h3 className={styles.cardTitle} style={{ border: 'none', padding: '0 0 32px 0' }}>
          <TrendingUp size={16} /> VOLUME PESANAN HARIAN
        </h3>
        {orderReport.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderReport}>
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
                cursor={{ fill: 'var(--color-bg-secondary)' }}
                formatter={(value: any) => [value, 'PESANAN']}
              />
              <Bar dataKey="orderCount" fill="var(--color-text-primary)" radius={0} name="PESANAN" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)' }}>
            BELUM ADA DATA VOLUME PESANAN
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        {/* Low Stock */}
        <div className={styles.tableContainer}>
          <h3 className={styles.th} style={{ borderBottomWidth: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} className={styles.badgeWarning} /> STOK MENIPIS (&lt; 10)
          </h3>
          <div style={{ padding: '0 16px' }}>
            {productReport?.lowStock?.length ? (
              productReport.lowStock.map((p: any) => (
                <div key={p.id} className={styles.td} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-bg-secondary)' }}>
                  <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>{p.name}</span>
                  <span className={styles.badgeWarning} style={{ fontWeight: '800' }}>{p.stock} UNIT</span>
                </div>
              ))
            ) : (
              <div className={styles.td} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                STOK SEMUA PRODUK AMAN
              </div>
            )}
          </div>
        </div>

        {/* Out of Stock */}
        <div className={styles.tableContainer}>
          <h3 className={styles.th} style={{ borderBottomWidth: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={14} className={styles.badgeDanger} /> STOK HABIS (0)
          </h3>
          <div style={{ padding: '0 16px' }}>
            {productReport?.outOfStock?.length ? (
              productReport.outOfStock.map((p: any) => (
                <div key={p.id} className={styles.td} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-bg-secondary)' }}>
                  <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>{p.name}</span>
                  <span className={styles.badgeDanger} style={{ fontWeight: '800' }}>HABIS</span>
                </div>
              ))
            ) : (
              <div className={styles.td} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                TIDAK ADA PRODUK YANG HABIS
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
