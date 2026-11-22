'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './browse.module.css';

export default function AppHeader({ user, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/', label: '내 캐릭터' },
    { href: '/explore', label: '둘러보기' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>
            <MessageCircle size={18} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className={styles.brandText}>AI 캐릭터</span>
        </Link>

        <nav className={styles.nav}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.navLink} ${pathname === l.href ? styles.navActive : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <button type="button" className={styles.headerBtn} onClick={onLogout}>
            로그아웃
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.headerBtn} ${styles.headerBtnPrimary}`}
            onClick={() => router.push('/login')}
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
