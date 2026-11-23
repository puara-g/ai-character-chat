'use client';

import { CloudOff } from 'lucide-react';
import styles from './GuestNotice.module.css';

// 로그인하지 않은 사용자에게: 저장되지 않는다는 한 줄 안내 + 회원가입 링크
export default function GuestNotice({ onLogin, className = '', what = '캐릭터와 대화가' }) {
  return (
    <div className={`${styles.notice} ${className}`}>
      <CloudOff className={styles.icon} size={16} aria-hidden="true" />
      <span className={styles.text}>체험 중이라 {what} 저장되지 않아요</span>
      <button type="button" className={styles.link} onClick={onLogin}>
        회원가입
      </button>
    </div>
  );
}
