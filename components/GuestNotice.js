'use client';

// 로그인하지 않은 사용자에게 "저장하려면 회원가입" 안내
export default function GuestNotice({ onLogin, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        background: '#fff8e6',
        border: '1px solid #ffe2a8',
        borderRadius: '14px',
        fontSize: '13px',
        color: '#6b5b2e',
        lineHeight: 1.5,
        ...style,
      }}
    >
      <span>
        체험 중이에요. 만든 캐릭터와 대화는 <b>창을 닫으면 사라져요.</b>
        <br />
        저장하려면 회원가입해 주세요.
      </span>
      <button
        onClick={onLogin}
        style={{
          flexShrink: 0,
          padding: '8px 12px',
          background: '#6c5ce7',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '13px',
        }}
      >
        회원가입
      </button>
    </div>
  );
}
