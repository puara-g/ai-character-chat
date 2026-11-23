'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { getReviews, saveReview, deleteReview, MAX_REVIEW } from '@/lib/reviews';
import { getNicknames } from '@/lib/profiles';
import styles from './Reviews.module.css';

const LABELS = ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요'];

export function StarRow({ value, size = 16 }) {
  return (
    <span className={styles.starRow} aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? styles.on : styles.off} aria-hidden="true" />
      ))}
    </span>
  );
}

const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 캐릭터 리뷰: 요약 + 내 리뷰 쓰기/고치기 + 목록.
 * canWrite: 로그인했고, 남이 만든 공개 캐릭터일 때
 */
export default function Reviews({ characterId, user, canWrite, blockedReason, onStatsChange }) {
  const [reviews, setReviews] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const mine = user ? reviews.find((r) => r.user_id === user.id) : null;

  const load = async () => {
    const list = await getReviews(characterId);
    setReviews(list);
    setNames(await getNicknames(list.map((r) => r.user_id)));
    setLoading(false);
    const count = list.length;
    onStatsChange?.(count ? { count, avg: list.reduce((s, r) => s + r.rating, 0) / count } : null);
  };

  useEffect(() => {
    // 마운트 시 1회 데이터 불러오기 (외부 저장소와 동기화)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const startEdit = () => {
    setRating(mine?.rating || 0);
    setContent(mine?.content || '');
    setMessage('');
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const problem = await saveReview({ characterId, userId: user.id, rating, content });
    setSaving(false);
    if (problem) return setMessage(problem);
    await load();
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!mine || !confirm('내 리뷰를 지울까요?')) return;
    const problem = await deleteReview(mine.id);
    if (problem) return setMessage(problem);
    await load();
    setEditing(false);
  };

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const shown = hover || rating;

  return (
    <section className={styles.section} aria-labelledby="reviews-title">
      <div className={styles.head}>
        <h2 id="reviews-title" className={styles.title}>
          리뷰 <span className={styles.count}>{count}</span>
        </h2>
        {count > 0 && (
          <span className={styles.summary}>
            <StarRow value={avg} />
            <b>{avg.toFixed(1)}</b>
          </span>
        )}
      </div>

      {/* 내 리뷰 */}
      {canWrite ? (
        editing ? (
          <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.picker} role="radiogroup" aria-label="별점" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n}점`}
                  className={styles.pickStar}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                >
                  <Star size={28} className={n <= shown ? styles.on : styles.off} aria-hidden="true" />
                </button>
              ))}
              <span className={styles.pickLabel}>{LABELS[shown] || '별점을 골라 주세요'}</span>
            </div>
            <textarea
              className={styles.textarea}
              placeholder="어떤 점이 좋았는지 짧게 남겨 주세요 (선택)"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_REVIEW))}
              rows={3}
            />
            <div className={styles.formFoot}>
              <span className={styles.counter}>
                {content.length} / {MAX_REVIEW}
              </span>
              <div className={styles.formBtns}>
                {mine && (
                  <button type="button" className={styles.dangerBtn} onClick={handleDelete}>
                    삭제
                  </button>
                )}
                <button type="button" className={styles.ghostBtn} onClick={() => setEditing(false)}>
                  취소
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={saving || !rating}>
                  {saving ? '저장 중...' : mine ? '수정하기' : '리뷰 남기기'}
                </button>
              </div>
            </div>
            {message && <p className={styles.error}>{message}</p>}
          </form>
        ) : (
          <button type="button" className={styles.writeBtn} onClick={startEdit}>
            {mine ? '내 리뷰 수정하기' : '이 캐릭터에 리뷰 남기기'}
          </button>
        )
      ) : (
        blockedReason && (
          <p className={styles.blocked}>
            {blockedReason === 'login' ? (
              <>
                <Link href="/login" className={styles.inlineLink}>
                  로그인
                </Link>
                하면 리뷰를 남길 수 있어요.
              </>
            ) : (
              '내가 만든 캐릭터에는 리뷰를 남길 수 없어요.'
            )}
          </p>
        )
      )}

      {/* 목록 */}
      {loading ? (
        <p className={styles.empty}>리뷰를 불러오는 중...</p>
      ) : count === 0 ? (
        <p className={styles.empty}>아직 리뷰가 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {reviews.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.author}>
                  {names[r.user_id] || '익명'}
                  {user && r.user_id === user.id && <span className={styles.me}>나</span>}
                </span>
                <StarRow value={r.rating} size={14} />
                <span className={styles.date}>{formatDate(r.created_at)}</span>
              </div>
              {r.content && <p className={styles.itemText}>{r.content}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
