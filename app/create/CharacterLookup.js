'use client';

import { useState } from 'react';
import { Check, ChevronRight, Search, Sparkles } from 'lucide-react';
import styles from './create.module.css';

const post = async (body) => {
  const res = await fetch('/api/autofill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json() };
};

/** 작품 속 캐릭터 검색 → 후보 목록 → 고르면 프로필 채우기 (onFill) */
export default function CharacterLookup({ onFill }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null); // null: 검색 전
  const [filling, setFilling] = useState(''); // 채우는 중인 후보 key
  const [picked, setPicked] = useState('');
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  const keyOf = (r) => `${r.work}|${r.name}`;

  const search = async () => {
    const q = query.trim();
    if (q.length < 2 || searching) return;
    setSearching(true);
    setMessage(null);
    setResults(null);
    try {
      const { ok, data } = await post({ query: q, mode: 'search' });
      if (!ok) {
        setMessage({ type: 'error', text: data.error || '검색하지 못했어요.' });
        return;
      }
      setResults(data.results);
      if (!data.results.length) {
        setMessage({ type: 'error', text: '맞는 캐릭터를 찾지 못했어요. 작품 이름을 같이 적어 보세요. (예: 원피스 루피)' });
      }
    } catch {
      setMessage({ type: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.' });
    } finally {
      setSearching(false);
    }
  };

  const fill = async (r) => {
    if (filling) return;
    setFilling(keyOf(r));
    setMessage(null);
    try {
      const { ok, data } = await post({ query: `${r.work} ${r.name}`.trim() });
      if (!ok) {
        setMessage({ type: 'error', text: data.error || '캐릭터 정보를 불러오지 못했어요.' });
        return;
      }
      onFill(data.profile);
      setPicked(keyOf(r));
      setMessage({
        type: 'info',
        text: `${r.work ? `${r.work}의 ` : ''}${data.profile.name} 정보를 채웠어요. ${data.grounded ? '검색 결과를 바탕으로' : 'AI가 알고 있는 정보로'} 채운 거라 틀린 부분이 있을 수 있으니 아래에서 확인해 주세요.`,
      });
    } catch {
      setMessage({ type: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.' });
    } finally {
      setFilling('');
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Sparkles className={styles.titleIcon} size={18} aria-hidden="true" /> 작품 속 캐릭터로 채우기
        <span className={styles.optional}>선택</span>
      </h2>
      <p className={styles.help}>애니·드라마·게임·소설 캐릭터나 작품 이름으로 검색하고, 목록에서 고르면 성격과 말투를 채워요. 실존 인물은 만들 수 없어요.</p>

      <div className={styles.lookupRow}>
        <input
          className={styles.input}
          placeholder="예: 루피, 귀멸의 칼날, 우영우"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // 폼 제출 대신 검색 (한글 조합 중 Enter는 무시)
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              search();
            }
          }}
          maxLength={60}
          aria-label="캐릭터 검색"
        />
        <button type="button" className={styles.lookupBtn} onClick={search} disabled={searching || query.trim().length < 2}>
          <Search size={16} aria-hidden="true" />
          {searching ? '찾는 중...' : '검색'}
        </button>
      </div>

      {searching && (
        <div className={styles.results} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.resultSkeleton} />
          ))}
        </div>
      )}

      {results?.length > 0 && (
        <ul className={styles.results} aria-label="검색 결과">
          {results.map((r) => {
            const k = keyOf(r);
            const isPicked = picked === k;
            return (
              <li key={k}>
                <button
                  type="button"
                  className={`${styles.result} ${isPicked ? styles.resultOn : ''}`}
                  onClick={() => fill(r)}
                  disabled={Boolean(filling)}
                >
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>
                      {r.name}
                      <span className={styles.resultKind}>{r.kind}</span>
                    </span>
                    <span className={styles.resultMeta}>
                      {r.work}
                      {r.oneLine && ` · ${r.oneLine}`}
                    </span>
                  </span>
                  <span className={styles.resultAction}>
                    {filling === k ? '채우는 중...' : isPicked ? <Check size={18} aria-label="채움" /> : <ChevronRight size={18} aria-hidden="true" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {message && (
        <p className={message.type === 'error' ? styles.fieldError : styles.fieldInfo} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
