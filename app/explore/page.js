'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import CharacterCard from '@/components/CharacterCard';
import styles from '@/components/browse.module.css';

const PAGE_LIMIT = 100;
const FILTERS = ['전체', '다정함', '츤데레', '장난기 많음', '시크함', '활발함', '존댓말', '반말'];

export default function ExplorePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
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
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) {
        console.error('공개 캐릭터 불러오기 실패:', error);
        setFailed(true);
      } else {
        setCharacters(data || []);
      }
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters.filter((c) => {
      const text = [c.name, c.personality, c.tone, c.detail].filter(Boolean).join(' ').toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter !== '전체' && !text.includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [characters, query, filter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />

      <main className={styles.container}>
        <div className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>둘러보기</h1>
            <p className={styles.heroSub}>다른 사람들이 공개한 캐릭터와 대화해 보세요. 대화 내용은 나만 볼 수 있어요.</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="search"
            placeholder="이름, 성격, 말투로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="캐릭터 검색"
          />
        </div>
        <div className={styles.chips} style={{ marginBottom: 20 }}>
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
            {visible.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onOpen={() => router.push(`/chat/${char.id}`)}
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
              style={{ marginTop: 8, color: 'var(--purple)' }}
              onClick={() => router.push('/create')}
            >
              내 캐릭터 만들어서 공개하기 →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
