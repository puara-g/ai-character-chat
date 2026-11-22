'use client';

import styles from './GuestNotice.module.css';

// 로그인하지 않은 사용자에게 "저장하려면 회원가입" 안내
export default function GuestNotice({ onLogin, className = '', what = '만든 캐릭터와 대화는' }) {
  return (
    <div className={`${styles.notice} ${className}`}>
      <span>
        체험 중이에요. {what} <b>창을 닫으면 사라져요.</b>
        <br />
        저장하려면 회원가입해 주세요.
      </span>
      <button type="button" className={styles.button} onClick={onLogin}>
        회원가입
      </button>
    </div>
  );
}
