'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Globe, MessageCircle, MessagesSquare, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isGuestId, getGuestCharacter } from '@/lib/guest';
import { getNicknames, creatorLabel } from '@/lib/profiles';
import AppHeader from '@/components/AppHeader';
import { CARD_COLUMNS, DEFAULT_AVATAR, coverFor } from '@/components/CharacterCard';
import { hasBatchim } from '@/app/create/greeting';
import styles from './detail.module.css';

const splitTags = (text = '') =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export default function CharacterDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [creator, setCreator] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing

  const load = async () => {
    let me = null;
    try {
      ({ data: { user: me } } = await supabase.auth.getUser());
    } catch {}
    setUser(me);

    if (isGuestId(id)) {
      const c = getGuestCharacter(id);
      if (!c) return setStatus('missing');
      setCharacter(c);
      setCreator('나 (체험 중)');
      return setStatus('ready');
    }

    const { data: c } = await supabase.from('characters').select(CARD_COLUMNS).eq('id', id).maybeSingle();
    if (!c) return setStatus('missing');
    setCharacter(c);
    const names = await getNicknames([c.user_id]);
    setCreator(me && c.user_id === me.id ? `${names[me.id] || '나'} (나)` : creatorLabel(c, names));
    setStatus('ready');
  };

  useEffect(() => {
    // 마운트 시 1회 데이터 불러오기 (외부 저장소와 동기화)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <AppHeader user={user} onLogout={handleLogout} />
        <main className={styles.container}>
          <div className={styles.skeleton} />
        </main>
      </div>
    );
  }

  if (status === 'missing') {
    return (
      <div className={styles.page}>
        <AppHeader user={user} onLogout={handleLogout} />
        <main className={styles.container}>
          <div className={styles.missing}>
            <p className={styles.missingTitle}>캐릭터를 찾을 수 없어요</p>
            <p className={styles.missingSub}>비공개로 바뀌었거나 삭제됐을 수 있어요. 체험 중에 만든 캐릭터는 창을 닫으면 사라져요.</p>
            <Link href="/explore" className={styles.secondaryBtn}>
              둘러보기로 가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tags = splitTags(character.personality);
  const age = character.age ? `${character.age}${/^\d+$/.test(String(character.age)) ? '살' : ''}` : '';
  const meta = [character.gender, age].filter(Boolean).join(' · ');
  const isMine = (user && character.user_id === user.id) || isGuestId(character.id);
  const isKakao = character.source === 'kakao';

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />

      <main className={styles.container}>
        <button type="button" className={styles.back} onClick={() => (window.history.length > 1 ? router.back() : router.push('/explore'))}>
          <ArrowLeft size={16} aria-hidden="true" />
          뒤로
        </button>

        <article className={styles.card}>
          <div className={styles.cover} style={{ background: coverFor(character.id || character.name) }} />

          <div className={styles.body}>
            <img
              className={styles.avatar}
              src={character.avatar_url || DEFAULT_AVATAR}
              alt=""
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />

            <div className={styles.badges}>
              {character.source === 'official' && <span className={styles.badge}>기본 캐릭터</span>}
              {isKakao && (
                <span className={styles.badge}>
                  <MessagesSquare size={12} aria-hidden="true" />
                  카톡 말투
                </span>
              )}
              {isGuestId(character.id) && <span className={`${styles.badge} ${styles.badgeTemp}`}>임시</span>}
              {isMine && !isGuestId(character.id) && (
                <span className={styles.badge}>
                  {character.is_public ? <Globe size={12} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
                  {character.is_public ? '공개 중' : '나만 보기'}
                </span>
              )}
            </div>

            <h1 className={styles.name}>{character.name}</h1>
            {meta && <p className={styles.meta}>{meta}</p>}

            {creator && (
              <p className={styles.creator}>
                <UserRound size={14} aria-hidden="true" />
                만든 사람 <b>{creator}</b>
              </p>
            )}

            {tags.length > 0 && (
              <div className={styles.tags}>
                {tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {(character.tone || isKakao) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>말투</h2>
                <p className={styles.text}>{character.tone || '카톡 대화에서 배운 실제 말투 그대로'}</p>
              </section>
            )}

            {character.detail && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>소개</h2>
                <p className={styles.text}>{character.detail}</p>
              </section>
            )}

            <button type="button" className={styles.primaryBtn} onClick={() => router.push(`/chat/${character.id}`)}>
              <MessageCircle size={18} aria-hidden="true" />
              {character.name}{hasBatchim(character.name) ? '과' : '와'} 대화하기
            </button>
          </div>
        </article>
      </main>
    </div>
  );
}
