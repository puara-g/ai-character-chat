'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyProfile, saveNickname, NICKNAME_HINT } from '@/lib/profiles';
import useNicknameCheck from '@/lib/useNicknameCheck';
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

  // 아직 닉네임이 없는 상태 (가입 직후·기존 사용자 첫 설정)
  const isFirstSetup = !loading && !saved;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const problem = await saveNickname(user.id, nickname);
    if (problem) {
      setMessage({ type: 'error', text: problem });
      setSaving(false);
      return;
    }
    // 처음 정한 거면 바로 메인으로, 바꾼 거면 여기서 안내만
    if (isFirstSetup) {
      router.push('/');
      return;
    }
    setSaved(nickname.trim());
    setMessage({ type: 'info', text: '닉네임을 저장했어요.' });
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // 입력하는 동안 형식·중복 확인
  const nickCheck = useNicknameCheck(nickname, { myId: user?.id, current: saved });
  const blocked = ['invalid', 'taken', 'checking'].includes(nickCheck.status);
  const unchanged = nickname.trim() === saved;

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />
      <main className={styles.container}>
        <h1 className={styles.title}>{isFirstSetup ? '닉네임 정하기' : '프로필 설정'}</h1>
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
            placeholder={loading ? '불러오는 중...' : '닉네임'}
            maxLength={12}
            disabled={loading}
            autoComplete="off"
          />
          <p
            className={['invalid', 'taken'].includes(nickCheck.status) ? styles.hintError : nickCheck.status === 'ok' ? styles.hintOk : styles.hint}
            aria-live="polite"
          >
            {nickCheck.message || NICKNAME_HINT}
          </p>

          {message && (
            <p className={message.type === 'error' ? styles.error : styles.info} role="status">
              {message.text}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={loading || saving || unchanged || blocked || !nickname.trim()}>
            {saving ? '저장 중...' : isFirstSetup ? '저장하고 시작하기' : '저장'}
          </button>

          {user?.email && <p className={styles.account}>로그인 계정: {user.email}</p>}
        </form>

        {user && (
          <button type="button" className={styles.logout} onClick={handleLogout}>
            로그아웃
          </button>
        )}
      </main>
    </div>
  );
}
