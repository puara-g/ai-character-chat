import { Compass, MessageCircle, Plus, Sparkles } from 'lucide-react';
import styles from './HomeBanner.module.css';

// 배너 오른쪽에 겹쳐 놓을 기본 아바타 (public/avatars, CC0)
const AVATARS = [
  { src: '/avatars/lumi.svg', className: styles.a1 },
  { src: '/avatars/doyun.svg', className: styles.a2 },
  { src: '/avatars/harin.svg', className: styles.a3 },
  { src: '/avatars/sian.svg', className: styles.a4 },
];

export default function HomeBanner({ user, onCreate, onExplore }) {
  return (
    <section className={styles.banner} aria-labelledby="home-banner-title">
      <div className={styles.text}>
        <span className={styles.chip}>
          <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
          AI 캐릭터 채팅
        </span>
        <h1 id="home-banner-title" className={styles.title}>
          오늘은 누구랑
          <br />
          이야기할까요?
        </h1>
        <p className={styles.sub}>
          {user
            ? '내가 만든 캐릭터와 대화하거나, 다른 사람들의 캐릭터를 만나보세요.'
            : '로그인 없이도 캐릭터를 만들고 대화할 수 있어요.'}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onCreate}>
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            새 캐릭터
          </button>
          <button type="button" className={styles.ghost} onClick={onExplore}>
            <Compass size={18} strokeWidth={2.2} aria-hidden="true" />
            둘러보기
          </button>
        </div>
      </div>

      <div className={styles.art} aria-hidden="true">
        {AVATARS.map((a) => (
          <span key={a.src} className={`${styles.avatar} ${a.className}`}>
            <img src={a.src} alt="" />
          </span>
        ))}
        <span className={styles.bubble}>
          <MessageCircle size={20} strokeWidth={2.4} />
        </span>
      </div>
    </section>
  );
}
