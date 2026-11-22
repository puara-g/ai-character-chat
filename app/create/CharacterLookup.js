'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import styles from './create.module.css';

/** 작품 속 캐릭터 이름으로 프로필 자동 채우기. 성공하면 onFill(profile) */
export default function CharacterLookup({ onFill }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  const lookup = async () => {
    const q = query.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '캐릭터 정보를 불러오지 못했어요.' });
        return;
      }
      onFill(data.profile);
      const from = data.profile.work ? `${data.profile.work}의 ${data.profile.name}` : data.profile.name;
      setMessage({
        type: 'info',
        text: `${from} 정보를 채웠어요. ${data.grounded ? '검색 결과를 바탕으로' : 'AI가 알고 있는 정보로'} 채운 거라 틀린 부분이 있을 수 있으니 아래에서 확인해 주세요.`,
      });
    } catch {
      setMessage({ type: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Sparkles className={styles.titleIcon} size={18} aria-hidden="true" /> 작품 속 캐릭터로 채우기
        <span className={styles.optional}>선택</span>
      </h2>
      <p className={styles.help}>애니·드라마·게임·소설 캐릭터 이름을 적으면 성격과 말투를 자동으로 채워요. 실존 인물은 만들 수 없어요.</p>

      <div className={styles.lookupRow}>
        <input
          className={styles.input}
          placeholder="예: 원피스 루피, 귀멸의 칼날 탄지로"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // 폼 제출 대신 검색 (한글 조합 중 Enter는 무시)
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              lookup();
            }
          }}
          maxLength={60}
          aria-label="캐릭터 이름"
        />
        <button type="button" className={styles.lookupBtn} onClick={lookup} disabled={loading || query.trim().length < 2}>
          <Search size={16} aria-hidden="true" />
          {loading ? '찾는 중...' : '불러오기'}
        </button>
      </div>

      {message && (
        <p className={message.type === 'error' ? styles.fieldError : styles.fieldInfo} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
