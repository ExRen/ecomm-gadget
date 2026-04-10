import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const contactInfo = [
    { Icon: Mail, text: 'support@gadgetpasaria.com' },
    { Icon: Phone, text: '+62 812-3456-7890' },
    { Icon: MapPin, text: 'Jakarta, Indonesia' },
  ];

  const belanjaLinks = [
    { label: 'Semua Produk', href: '/products' },
    { label: 'Produk Unggulan', href: '/products?featured=true' },
    { label: 'Promo', href: '/products?sortBy=price_asc' },
    { label: 'Kategori', href: '/products' },
  ];

  const akunLinks = [
    { label: 'Profil Saya', href: '/account' },
    { label: 'Pesanan Saya', href: '/account/orders' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Alamat', href: '/account/addresses' },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.container}`}>
        <div className={styles.grid}>
          {/* Brand */}
          <div>
            <div className={styles.brandHeader}>
              <div className={styles.logoIcon}>G</div>
              <span className={styles.logoText}>GadgetPasaria</span>
            </div>
            <p className={styles.description}>
              GadgetPasaria adalah pusat teknologi terkurasi yang menghadirkan inovasi terbaru untuk mendukung produktivitas dan gaya hidup digital Anda.
            </p>
            <div className={styles.socialGrid}>
              {[Mail, Phone, MapPin].map((Icon, i) => (
                <a key={i} href="#" className={styles.socialBtn}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={styles.heading}>Belanja</h4>
            {belanjaLinks.map((link) => (
              <Link key={link.label} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Account */}
          <div>
            <h4 className={styles.heading}>Akun</h4>
            {akunLinks.map((link) => (
              <Link key={link.label} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 className={styles.heading}>Hubungi Kami</h4>
            <div className={styles.contactList}>
              {contactInfo.map(({ Icon, text }, i) => (
                <div key={i} className={styles.contactItem}>
                  <Icon size={16} className={styles.contactIcon} /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © 2024 GadgetPasaria. All rights reserved.
          </p>
          <div className={styles.legalLinks}>
            {['Kebijakan Privasi', 'Syarat & Ketentuan'].map((t) => (
              <a key={t} href="#" className={styles.legalLink}>{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
