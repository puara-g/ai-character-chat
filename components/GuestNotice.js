'use client';

import { useRouter } from 'next/navigation';
import styles from './GuestNotice.module.css';

// 로그인하지 않은 사용자에게 화면 맨 위 띠로: 저장되지 않는다는 안내 + 로그인 (헤더엔 로그인 버튼 없음)
export default function GuestNotice({ what = '대화가' }) {
  const router = useRouter();
  return (
    <div className={styles.banner} role="region" aria-label="체험 모드 안내">
      <div className={styles.inner}>
        <img className={styles.logo} src="/logo.png" alt="" width={28} height={28} />
        <span className={styles.text}>
          체험 중이라 {what} 저장되지 않아요<span className={styles.sub}>. 로그인하면 저장돼요</span>
        </span>
        <button type="button" className={styles.button} onClick={() => router.push('/login')}>
          로그인
        </button>
      </div>
    </div>
  );
}
