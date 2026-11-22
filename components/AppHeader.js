'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/profiles';
import styles from './browse.module.css';

export default function AppHeader({ user, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    let alive = true;
    if (user?.id) {
      getMyProfile(user.id).then((p) => alive && setNickname(p?.nickname || ''));
    }
    return () => {
      alive = false;
    };
  }, [user?.id]);

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
          <div className={styles.headerUser}>
            <Link href="/settings" className={styles.profileLink} title="닉네임 설정">
              <UserRound size={16} aria-hidden="true" />
              <span className={styles.profileName}>{user.id && nickname ? nickname : '닉네임 설정'}</span>
            </Link>
            <button type="button" className={styles.headerBtn} onClick={onLogout}>
              로그아웃
            </button>
          </div>
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
