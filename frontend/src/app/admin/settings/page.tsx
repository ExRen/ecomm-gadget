'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Save, Truck, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import styles from '../AdminUI.module.css';
import toast from 'react-hot-toast';

interface SettingItem {
  key: string;
  value: string;
  label: string;
}

const DEFAULT_SETTINGS: SettingItem[] = [
  { key: 'shipping_cost', value: '15000', label: 'Biaya Pengiriman (Rp)' },
  { key: 'free_shipping_min', value: '500000', label: 'Minimum Gratis Ongkir (Rp)' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      const existing = data.data?.settings || data.settings || [];

      // Merge with defaults
      const merged = DEFAULT_SETTINGS.map(def => {
        const found = existing.find((s: SettingItem) => s.key === def.key);
        return found ? { ...def, value: found.value } : def;
      });
      setSettings(merged);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: settings.map(s => ({
          key: s.key,
          value: s.value,
          label: s.label,
        })),
      });
      toast.success('Pengaturan berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseInt(value) || 0;
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Pengaturan Toko</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={styles.addBtn}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'MENYIMPAN...' : 'SIMPAN PENGATURAN'}
        </button>
      </header>

      <div className={styles.tableContainer}>
        {/* Shipping Settings Section */}
        <div style={{ padding: '32px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '24px', paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <Truck size={20} style={{ color: 'var(--color-text-primary)' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Pengaturan Pengiriman
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', marginTop: '2px' }}>
                Atur biaya pengiriman untuk setiap pesanan
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
              {[1, 2].map(i => (
                <div key={i} className="skeleton" style={{ height: '72px', width: '100%', borderRadius: '0' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
              {settings.map((setting) => (
                <div key={setting.key} style={{
                  display: 'flex', alignItems: 'center', gap: '24px',
                  padding: '20px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)',
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      fontSize: '11px', fontWeight: '900',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.5px',
                      display: 'block', marginBottom: '8px',
                    }}>
                      {setting.label}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '13px', fontWeight: '800', color: 'var(--color-text-muted)',
                        padding: '10px 14px',
                        border: '1px solid var(--color-border)',
                        borderRight: 'none',
                        background: 'var(--color-bg-secondary)',
                      }}>Rp</span>
                      <input
                        type="number"
                        value={setting.value}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="input"
                        style={{
                          flex: 1,
                          borderRadius: '0',
                          border: '1px solid var(--color-border)',
                          padding: '10px 14px',
                          fontSize: '14px',
                          fontWeight: '700',
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: '10px', fontWeight: '700',
                      color: 'var(--color-text-muted)',
                      marginTop: '8px', textTransform: 'uppercase' as const,
                    }}>
                      Preview: Rp {formatCurrency(setting.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
