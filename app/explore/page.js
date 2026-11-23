'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import CharacterCard, { CARD_COLUMNS } from '@/components/CharacterCard';
import styles from '@/components/browse.module.css';
import { getNicknames, creatorLabel } from '@/lib/profiles';
import { getStats, rankScore } from '@/lib/reviews';

const PAGE_LIMIT = 100;
// 검색 범위
const SCOPES = [
  { value: 'all', label: '전체', placeholder: '이름, 성격, 말투, 소개, 제작자로 검색' },
  { value: 'name', label: '이름', placeholder: '캐릭터 이름으로 검색' },
  { value: 'creator', label: '제작자', placeholder: '제작자 닉네임으로 검색' },
];
// 정렬 (별점순일 때는 카드에 순위 표시 = 랭킹)
const SORTS = [
  { value: 'rating', label: '별점순' },
  { value: 'reviews', label: '리뷰 많은순' },
  { value: 'latest', label: '최신순' },
];
const FILTERS = ['전체', '다정함', '츤데레', '장난기 많음', '시크함', '활발함', '존댓말', '반말'];

export default function ExplorePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [stats, setStats] = useState({});
  const [sort, setSort] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [filter, setFilter] = useState('전체');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);
      } catch {}

      const { data, error } = await supabase
        .from('characters')
        .select(CARD_COLUMNS)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) {
        console.error('공개 캐릭터 불러오기 실패:', error);
        setFailed(true);
      } else {
        setCharacters(data || []);
        const list = data || [];
        const [names, st] = await Promise.all([getNicknames(list.map((c) => c.user_id)), getStats(list.map((c) => c.id))]);
        setNicknames(names);
        setStats(st);
      }
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = characters.filter((c) => {
      const creator = (creatorLabel(c, nicknames) || '').toLowerCase();
      const text = [c.name, c.personality, c.tone, c.detail, creator].filter(Boolean).join(' ').toLowerCase();
      const target = scope === 'name' ? (c.name || '').toLowerCase() : scope === 'creator' ? creator : text;
      if (q && !target.includes(q)) return false;
      if (filter !== '전체' && !text.includes(filter.toLowerCase())) return false;
      return true;
    });
    const byLatest = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'latest') return list.sort(byLatest);
    if (sort === 'reviews') return list.sort((a, b) => (stats[b.id]?.count || 0) - (stats[a.id]?.count || 0) || byLatest(a, b));
    return list.sort((a, b) => rankScore(stats[b.id]) - rankScore(stats[a.id]) || byLatest(a, b));
  }, [characters, query, filter, nicknames, scope, sort, stats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} guest={!loading && !user} />

      <main className={styles.container}>
        <div className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>둘러보기</h1>
            <p className={styles.heroSub}>다른 사람들이 공개한 캐릭터와 대화해 보세요. 대화 내용은 나만 볼 수 있어요.</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.scope} role="radiogroup" aria-label="검색 범위">
            {SCOPES.map((sc) => (
              <button
                key={sc.value}
                type="button"
                role="radio"
                aria-checked={scope === sc.value}
                className={`${styles.scopeBtn} ${scope === sc.value ? styles.scopeOn : ''}`}
                onClick={() => setScope(sc.value)}
              >
                {sc.label}
              </button>
            ))}
          </div>
          <label className={styles.searchWrap}>
            <Search className={styles.searchIcon} size={18} aria-hidden="true" />
            <input
              className={styles.search}
              type="search"
              placeholder={SCOPES.find((sc) => sc.value === scope).placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="캐릭터 검색"
            />
          </label>
        </div>
        <div className={styles.chips}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${filter === f ? styles.chipOn : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className={styles.sortRow}>
          <span className={styles.resultCount}>{loading ? '' : `캐릭터 ${visible.length}개`}</span>
          <div className={styles.sortTabs} role="radiogroup" aria-label="정렬">
            {SORTS.map((so) => (
              <button
                key={so.value}
                type="button"
                role="radio"
                aria-checked={sort === so.value}
                className={`${styles.sortTab} ${sort === so.value ? styles.sortTabOn : ''}`}
                onClick={() => setSort(so.value)}
              >
                {so.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : failed ? (
          <div className={styles.empty}>캐릭터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
        ) : visible.length ? (
          <div className={styles.grid}>
            {visible.map((char, i) => (
              <CharacterCard
                key={char.id}
                character={char}
                creator={creatorLabel(char, nicknames)}
                rating={stats[char.id] || null}
                rank={sort === 'rating' && stats[char.id]?.count ? i + 1 : undefined}
                onOpen={() => router.push(`/character/${char.id}`)}
                badge={user && char.user_id === user.id ? '내 캐릭터' : null}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            {characters.length ? '조건에 맞는 캐릭터가 없어요.' : '아직 공개된 캐릭터가 없어요.'}
            <br />
            <button
              type="button"
              className={styles.moreLink}
              style={{ marginTop: 'var(--space-2)', color: 'var(--purple)' }}
              onClick={() => router.push('/create')}
            >
              내 캐릭터 만들어서 공개하기 <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
