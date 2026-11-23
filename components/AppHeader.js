'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getMyProfile } from '@/lib/profiles';
import GuestNotice from './GuestNotice';
import styles from './browse.module.css';

export default function AppHeader({ user, onLogout, guest = false }) {
  const pathname = usePathname();
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
    { href: '/ranking', label: '랭킹' },
    { href: '/explore', label: '둘러보기' },
  ];

  return (
    <>
      {guest && <GuestNotice />}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <img className={styles.brandMark} src="/logo.png" alt="" width={32} height={32} />
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
          ) : null /* 로그인 전에는 맨 위 체험 안내 띠의 버튼 하나로 로그인 */}
        </div>
      </header>
    </>
  );
}
