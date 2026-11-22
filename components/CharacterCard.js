'use client';

import styles from './browse.module.css';
import { ArrowRight } from 'lucide-react';

export const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

// 이름으로 카드 윗부분 색을 정해서 카드마다 조금씩 다르게
const COVERS = [
  'linear-gradient(135deg, #a29bfe, #6c5ce7)',
  'linear-gradient(135deg, #fbc2eb, #a18cd1)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #ffd3a5, #fd6585)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #fddb92, #f6a5c0)',
];

const coverFor = (key = '') => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length];
};

const splitTags = (text = '') =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export default function CharacterCard({ character, onOpen, badge, badgeTone, footer }) {
  const tags = splitTags(character.personality).slice(0, 3);
  const age = character.age ? `${character.age}${/^\d+$/.test(String(character.age)) ? '살' : ''}` : '';
  const meta = [character.gender, age].filter(Boolean).join(' · ');

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen();
      }}
    >
      <div className={styles.cover} style={{ background: coverFor(character.id || character.name) }} />
      {badge && <span className={`${styles.badge} ${badgeTone === 'temp' ? styles.badgeTemp : ''}`}>{badge}</span>}

      <div className={styles.cardBody}>
        <img
          className={styles.avatar}
          src={character.avatar_url || DEFAULT_AVATAR}
          alt=""
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR;
          }}
        />
        <h3 className={styles.name}>{character.name}</h3>
        <div className={styles.meta}>{meta}</div>

        <div className={styles.tags}>
          {tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
          {character.tone && <span className={`${styles.tag} ${styles.tagTone}`}>{character.tone}</span>}
        </div>

        {character.detail && <p className={styles.snippet}>{character.detail}</p>}

        <div className={styles.cardFoot}>
          {footer || (
            <span className={styles.chatHint}>
              대화하기 <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
