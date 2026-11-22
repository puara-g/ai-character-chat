'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyProfile, saveNickname, checkNickname, NICKNAME_HINT } from '@/lib/profiles';
import AppHeader from '@/components/AppHeader';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  useEffect(() => {
    (async () => {
      let me = null;
      try {
        ({ data: { user: me } } = await supabase.auth.getUser());
      } catch {}
      if (!me) {
        router.replace('/login');
        return;
      }
      setUser(me);
      const p = await getMyProfile(me.id);
      setNickname(p?.nickname || '');
      setSaved(p?.nickname || '');
      setLoading(false);
    })();
  }, [router]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const problem = await saveNickname(user.id, nickname);
    if (problem) {
      setMessage({ type: 'error', text: problem });
    } else {
      setSaved(nickname.trim());
      setMessage({ type: 'info', text: '닉네임을 저장했어요.' });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatProblem = nickname.trim() ? checkNickname(nickname) : '';
  const unchanged = nickname.trim() === saved;

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />
      <main className={styles.container}>
        <h1 className={styles.title}>프로필 설정</h1>
        <p className={styles.sub}>닉네임은 내가 공개한 캐릭터에 &ldquo;만든 사람&rdquo;으로 보이고, 둘러보기에서 검색할 수 있어요.</p>

        <form className={styles.card} onSubmit={handleSave}>
          <label className={styles.label} htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            className={styles.input}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={loading ? '불러오는 중...' : '예: 캐릭터장인'}
            maxLength={12}
            disabled={loading}
            autoComplete="off"
          />
          <p className={formatProblem ? styles.hintError : styles.hint}>{formatProblem || NICKNAME_HINT}</p>

          {message && (
            <p className={message.type === 'error' ? styles.error : styles.info} role="status">
              {message.text}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={loading || saving || unchanged || Boolean(formatProblem) || !nickname.trim()}>
            {saving ? '저장 중...' : '저장'}
          </button>

          {user?.email && <p className={styles.account}>로그인 계정: {user.email}</p>}
        </form>
      </main>
    </div>
  );
}
