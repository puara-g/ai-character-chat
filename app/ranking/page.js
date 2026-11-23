'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import CharacterCard, { CARD_COLUMNS } from '@/components/CharacterCard';
import { getNicknames, creatorLabel } from '@/lib/profiles';
import { getStats, rankScore } from '@/lib/reviews';
import { PERIODS, getActivity, updatedLabel, baseLabel } from '@/lib/ranking';
import styles from '@/components/browse.module.css';
import rankStyles from './ranking.module.css';

const REFRESH_MS = 60 * 1000; // 열어 두면 1분마다 다시 집계
const MAX_RANK = 30;
const CATEGORIES = ['전체', '다정함', '츤데레', '장난기 많음', '시크함', '활발함', '존댓말', '반말'];

export default function RankingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState({});
  const [period, setPeriod] = useState(PERIODS[0].value);
  const [category, setCategory] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // 공개 캐릭터·닉네임·별점 (자주 안 바뀜)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);
      } catch {}
      setAuthChecked(true);

      const { data, error } = await supabase.from('characters').select(CARD_COLUMNS).eq('is_public', true).limit(200);
      if (error) {
        setFailed(true);
        setLoading(false);
        return;
      }
      const list = data || [];
      setCharacters(list);
      const [names, st] = await Promise.all([getNicknames(list.map((c) => c.user_id)), getStats(list.map((c) => c.id))]);
      setNicknames(names);
      setStats(st);
    })();
  }, []);

  // 대화 활동 (기간이 바뀌거나 1분마다)
  const loadActivity = useCallback(async () => {
    const act = await getActivity(period);
    if (act) {
      setActivity(act);
      setUpdatedAt(Date.now());
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    // 기간이 바뀌면 다시 집계하고, 열어 둔 동안 1분마다 갱신 (외부 데이터와 동기화)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivity();
    const timer = setInterval(() => {
      loadActivity();
      setNow(Date.now());
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadActivity]);

  // "n분 전" 글자만 30초마다 새로
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const ranked = useMemo(() => {
    const list = characters.filter((c) => {
      if (category === '전체') return true;
      const text = [c.personality, c.tone].filter(Boolean).join(' ');
      return text.includes(category);
    });
    // 1순위: 대화한 사람 수, 2순위: 메시지 수, 그다음 별점 (최근 대화가 없는 캐릭터는 별점순으로 뒤에)
    return list
      .sort(
        (a, b) =>
          (activity[b.id]?.chatters || 0) - (activity[a.id]?.chatters || 0) ||
          (activity[b.id]?.messages || 0) - (activity[a.id]?.messages || 0) ||
          rankScore(stats[b.id]) - rankScore(stats[a.id])
      )
      .slice(0, MAX_RANK);
  }, [characters, category, activity, stats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const periodInfo = PERIODS.find((p) => p.value === period);

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} guest={authChecked && !user} />

      <main className={styles.container}>
        <div className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>{periodInfo.label} 랭킹</h1>
            <p className={styles.heroSub}>{periodInfo.desc}으로, 많은 사람이 대화한 캐릭터 순서예요.</p>
          </div>
        </div>

        <div className={rankStyles.periods} role="tablist" aria-label="랭킹 기간">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              className={`${rankStyles.period} ${period === p.value ? rankStyles.periodOn : ''}`}
              onClick={() => {
                setLoading(true);
                setPeriod(p.value);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.chips}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.chip} ${category === c ? styles.chipOn : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className={styles.sortRow}>
          <span className={rankStyles.updated}>
            {updatedAt && (
              <>
                <RefreshCw size={13} aria-hidden="true" />
                <time dateTime={new Date(updatedAt).toISOString()} className={rankStyles.base}>
                  {baseLabel(updatedAt)}
                </time>
                <span aria-hidden="true">·</span>
                {updatedLabel(updatedAt, now)}
              </>
            )}
          </span>
          <button type="button" className={styles.moreLink} onClick={loadActivity}>
            새로고침
          </button>
        </div>

        {loading && !characters.length ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : failed ? (
          <div className={styles.empty}>랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
        ) : ranked.length ? (
          <div className={styles.grid}>
            {ranked.map((char, i) => {
              const act = activity[char.id];
              return (
                <CharacterCard
                  key={char.id}
                  character={char}
                  rank={i + 1}
                  creator={creatorLabel(char, nicknames)}
                  rating={stats[char.id] || null}
                  activity={act?.chatters ? `${act.chatters.toLocaleString()}명 대화중` : null}
                  badge={user && char.user_id === user.id ? '내 캐릭터' : null}
                  onOpen={() => router.push(`/character/${char.id}`)}
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>이 카테고리에는 아직 캐릭터가 없어요.</div>
        )}
      </main>
    </div>
  );
}
