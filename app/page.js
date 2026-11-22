'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getGuestCharacters, removeGuestCharacter, isGuestId } from '@/lib/guest';
import GuestNotice from '@/components/GuestNotice';
import AppHeader from '@/components/AppHeader';
import CharacterCard from '@/components/CharacterCard';
import styles from '@/components/browse.module.css';

const PUBLIC_PREVIEW_COUNT = 8;

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [publicCharacters, setPublicCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadPublic = async (me) => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(PUBLIC_PREVIEW_COUNT + 8);
    if (error) {
      console.error('공개 캐릭터 불러오기 실패:', error);
      return;
    }
    setPublicCharacters((data || []).filter((c) => !me || c.user_id !== me.id).slice(0, PUBLIC_PREVIEW_COUNT));
  };

  const load = async () => {
    let me = null;
    try {
      const { data } = await supabase.auth.getUser();
      me = data?.user || null;
    } catch (err) {
      console.error('사용자 확인 실패:', err);
    }
    setUser(me);

    try {
      if (me) {
        const { data: mine } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', me.id)
          .order('created_at', { ascending: false });
        setCharacters(mine || []);
      } else {
        // 로그인 안 했으면 체험 모드: 이 탭에 임시 저장된 캐릭터만
        setCharacters(getGuestCharacters());
      }
      await loadPublic(me);
    } catch (err) {
      console.error('캐릭터 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 마운트 시 1회 데이터 불러오기 (외부 저장소와 동기화)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (e, char) => {
    e.stopPropagation();
    if (!confirm(`'${char.name}' 캐릭터를 삭제할까요?\n이 작업은 되돌릴 수 없어요.`)) return;

    if (isGuestId(char.id)) {
      removeGuestCharacter(char.id);
      setCharacters((prev) => prev.filter((c) => c.id !== char.id));
      return;
    }

    const { error } = await supabase.from('characters').delete().eq('id', char.id);
    if (error) {
      alert(`삭제 중 오류가 발생했어요: ${error.message}`);
      return;
    }
    setCharacters((prev) => prev.filter((c) => c.id !== char.id));
  };

  const handleTogglePublic = async (e, char) => {
    e.stopPropagation();
    const next = !char.is_public;
    setCharacters((prev) => prev.map((c) => (c.id === char.id ? { ...c, is_public: next } : c)));

    const { error } = await supabase.from('characters').update({ is_public: next }).eq('id', char.id);
    if (error) {
      setCharacters((prev) => prev.map((c) => (c.id === char.id ? { ...c, is_public: !next } : c)));
      alert(`공개 설정을 바꾸지 못했어요: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCharacters(getGuestCharacters());
    loadPublic(null);
  };

  const ownerFooter = (char) => {
    const guest = isGuestId(char.id);
    return (
      <>
        {guest ? (
          <span className={styles.chatHint}>
            대화하기 <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </span>
        ) : (
          <button
            type="button"
            className={`${styles.pill} ${char.is_public ? styles.pillOn : ''}`}
            onClick={(e) => handleTogglePublic(e, char)}
            title={char.is_public ? '눌러서 비공개로 바꾸기' : '눌러서 둘러보기에 공개하기'}
          >
            <span className={styles.dot} />
            {char.is_public ? '공개 중' : '비공개'}
          </button>
        )}
        <button
          type="button"
          className={styles.iconBtn}
          onClick={(e) => handleDelete(e, char)}
          aria-label={`${char.name} 삭제`}
        >
          <Trash2 size={14} aria-hidden="true" />
          삭제
        </button>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />

      <main className={styles.container}>
        <div className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>오늘은 누구랑 이야기할까요?</h1>
            <p className={styles.heroSub}>
              {user ? '내가 만든 캐릭터와 대화하거나, 다른 사람들의 캐릭터를 만나보세요.' : '로그인 없이도 캐릭터를 만들고 대화할 수 있어요.'}
            </p>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={() => router.push('/create')}>
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            새 캐릭터
          </button>
        </div>

        {!loading && !user && <GuestNotice onLogin={() => router.push('/login?mode=signup')} />}

        {/* 내 캐릭터 */}
        <section className={`${styles.section} ${styles.sectionFirst}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              내 캐릭터{!loading && <span className={styles.count}>{characters.length}</span>}
            </h2>
          </div>

          {loading ? (
            <div className={styles.grid}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : characters.length ? (
            <div className={styles.grid}>
              {characters.map((char) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  onOpen={() => router.push(`/chat/${char.id}`)}
                  badge={isGuestId(char.id) ? '임시' : null}
                  badgeTone="temp"
                  footer={ownerFooter(char)}
                />
              ))}
            </div>
          ) : (
            <button type="button" className={styles.createCard} onClick={() => router.push('/create')}>
              <span className={styles.plus}>
                <Plus size={20} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className={styles.createText}>
                <span className={styles.createTitle}>첫 캐릭터를 만들어 보세요</span>
                <span className={styles.createSub}>이름, 성격, 말투만 정하면 바로 대화할 수 있어요</span>
              </span>
              <ArrowRight className={styles.createArrow} size={18} aria-hidden="true" />
            </button>
          )}
        </section>

        {/* 다른 사람들의 캐릭터 */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>다른 사람들의 캐릭터</h2>
            <button type="button" className={styles.moreLink} onClick={() => router.push('/explore')}>
              전체 보기 <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <div className={styles.grid}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : publicCharacters.length ? (
            <div className={styles.grid}>
              {publicCharacters.map((char) => (
                <CharacterCard key={char.id} character={char} onOpen={() => router.push(`/chat/${char.id}`)} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              아직 공개된 캐릭터가 없어요.
              <br />
              {user ? '내 캐릭터를 공개해서 첫 번째 주인공이 되어 보세요!' : '회원가입하고 캐릭터를 공개해 보세요!'}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
