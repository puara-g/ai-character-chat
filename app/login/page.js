'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // 로그인 / 회원가입 모드 전환
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // "저장하려면 회원가입" 버튼으로 들어오면 회원가입 모드로 시작
  useEffect(() => {
    // 정적 페이지라 URL은 브라우저에서만 읽을 수 있어서 마운트 후 1회 설정
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setIsSignUp(true);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // 회원가입
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(`회원가입 실패: ${error.message}`);
      else alert('회원가입 성공! 로그인해 주세요.');
    } else {
      // 로그인
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(`로그인 실패: ${error.message}`);
      } else {
        router.push('/'); // 로그인 성공 시 메인 화면으로 이동
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: '400px', margin: '80px auto', padding: '20px', textAlign: 'center' }}>
      <h2>{isSignUp ? '회원가입' : '로그인'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? '처리 중...' : isSignUp ? '회원가입 하기' : '로그인 하기'}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '14px', color: '#666', cursor: 'pointer' }} onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
      </p>

      <p style={{ marginTop: '8px', fontSize: '13px', color: '#999', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/')}>
        로그인 없이 체험하기
      </p>
    </main>
  );
}