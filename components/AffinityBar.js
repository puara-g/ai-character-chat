'use client';

import { Heart, ChevronDown } from 'lucide-react';
import { levelOf } from '@/lib/affinity';
import styles from './AffinityBar.module.css';

/** 대화방 헤더 아래 호감도 게이지 + "기억하는 것" 목록 */
export default function AffinityBar({ affinity, romance, delta, deltaKey, open, onToggle }) {
  const level = levelOf(affinity.score, romance);
  const memories = affinity.memories || [];
  // 이번 단계 안에서 얼마나 찼는지
  const span = Math.max(1, level.nextMin - level.min);
  const fill = level.index === 4 ? (affinity.score - level.min) / (100 - level.min || 1) : (affinity.score - level.min) / span;

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.bar} onClick={onToggle} aria-expanded={open} aria-label="호감도 자세히 보기">
        <Heart className={styles.heart} size={16} aria-hidden="true" />
        <span className={styles.level}>{level.name}</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ width: `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` }} />
        </span>
        <span className={styles.score}>{affinity.score}</span>
        {delta ? (
          <span key={deltaKey} className={`${styles.delta} ${delta > 0 ? styles.up : styles.down}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        ) : null}
        <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>기억하는 것 {memories.length ? memories.length : ''}</p>
          {memories.length ? (
            <ul className={styles.memories}>
              {[...memories].reverse().map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>아직 기억하는 게 없어요. 나에 대해 이야기해 보세요.</p>
          )}
          <p className={styles.help}>
            다정하게 대하거나 예전 얘기를 기억해 주면 호감도가 올라요. 호감도가 오를수록 내 말투를 닮아가요.
            {!romance && ' 이 캐릭터와는 우정으로만 가까워져요.'}
          </p>
        </div>
      )}
    </div>
  );
}
