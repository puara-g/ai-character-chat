'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { checkNickname, isNicknameTaken, saveNickname, getMyProfile, NICKNAME_HINT } from '@/lib/profiles';
import styles from './login.module.css';

// 이메일 인증 때문에 가입 직후 저장하지 못한 닉네임은 첫 로그인 때 저장
const PENDING_KEY = 'pending_nickname';
const readPending = () => {
  try {
    return localStorage.getItem(PENDING_KEY) || '';
  } catch {
    return '';
  }
};
const writePending = (v) => {
  try {
    if (v) localStorage.setItem(PENDING_KEY, v);
    else localStorage.removeItem(PENDING_KEY);
  } catch {}
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // 로그인 / 회원가입 모드 전환
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
  const router = useRouter();

  // "저장하려면 회원가입" 버튼으로 들어오면 회원가입 모드로 시작
  useEffect(() => {
    // 정적 페이지라 URL은 브라우저에서만 읽을 수 있어서 마운트 후 1회 설정
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setIsSignUp(true);
  }, []);

  const switchMode = (signUp) => {
    setIsSignUp(signUp);
    setMessage(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const problem = checkNickname(nickname);
        if (problem || (await isNicknameTaken(nickname))) {
          setMessage({ type: 'error', text: problem || '이미 쓰고 있는 닉네임이에요. 다른 닉네임을 정해 주세요.' });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage({ type: 'error', text: `회원가입 실패: ${error.message}` });
        } else if (data.session) {
          // 이메일 인증이 꺼져 있으면 바로 로그인됨 → 닉네임 바로 저장
          const saveProblem = await saveNickname(data.user.id, nickname);
          if (saveProblem) writePending(nickname.trim());
          router.push(saveProblem ? '/settings' : '/');
          router.refresh();
          return;
        } else {
          writePending(nickname.trim());
          setMessage({ type: 'info', text: '가입 완료! 메일함에서 인증 링크를 누른 뒤 로그인해 주세요.' });
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage({ type: 'error', text: '이메일 또는 비밀번호가 맞지 않아요.' });
        } else {
          // 닉네임이 없으면: 가입 때 적어 둔 게 있으면 저장, 아니면 설정 페이지로
          let needsNickname = false;
          if (!(await getMyProfile(data.user.id))) {
            const pending = readPending();
            needsNickname = !pending || Boolean(await saveNickname(data.user.id, pending));
          }
          writePending('');
          router.push(needsNickname ? '/settings' : '/');
          router.refresh();
          return;
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '문제가 생겼어요. 다시 시도해 주세요.' });
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>
            <MessageCircle size={18} strokeWidth={2.4} aria-hidden="true" />
          </span>
          AI 캐릭터
        </Link>

        <h1 className={styles.title}>{isSignUp ? '계정 만들기' : '다시 만나서 반가워요'}</h1>
        <p className={styles.sub}>
          {isSignUp ? '가입하면 만든 캐릭터와 대화가 저장돼요.' : '로그인하고 내 캐릭터와 이어서 대화하세요.'}
        </p>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`${styles.tab} ${!isSignUp ? styles.tabOn : ''}`}
            onClick={() => switchMode(false)}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`${styles.tab} ${isSignUp ? styles.tabOn : ''}`}
            onClick={() => switchMode(true)}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleAuth} className={styles.form}>
          {isSignUp && (
            <div>
              <label className={styles.label} htmlFor="nickname">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                className={styles.input}
                placeholder="예: 캐릭터장인"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                autoComplete="nickname"
                required
              />
              <p className={styles.hint}>{NICKNAME_HINT} · 내가 공개한 캐릭터에 &ldquo;만든 사람&rdquo;으로 보여요</p>
            </div>
          )}
          <div>
            <label className={styles.label} htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className={styles.label} htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder={isSignUp ? '6자 이상' : '비밀번호'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </div>

          {message && (
            <p className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageInfo}`} role="status">
              {message.text}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>또는</span>
        </div>

        <button type="button" className={styles.guest} onClick={() => router.push('/')}>
          로그인 없이 체험하기
        </button>
      </main>
    </div>
  );
}
