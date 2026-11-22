'use client';

import { useEffect, useRef, useState, use } from 'react';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { isGuestId, getGuestCharacter, getGuestMessages, setGuestMessages, getGuestMemory } from '@/lib/guest';
import { findMemories } from '@/lib/kakao';
import { embedTexts } from '@/lib/embed';
import GuestNotice from '@/components/GuestNotice';
import styles from './chat.module.css';

// 프로필 이미지가 없을 때 띄울 기본 이미지
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

export default function ChatPage({ params }) {
  const resolvedParams = use(params);
  const characterId = resolvedParams.id;
  const router = useRouter();

  const [character, setCharacter] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // 로그인 안 했으면 대화를 이 탭에만 임시 보관 (체험 캐릭터든 공개 캐릭터든)
  const [isGuest, setIsGuest] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  // 카톡 캐릭터의 '상대 말 → 실제 대답' 쌍 (화면 상태와 무관해서 ref로 보관)
  const memoryRef = useRef([]);

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const initChat = async () => {
    // 체험 모드 캐릭터: 이 탭에 임시 저장된 데이터 사용
    if (isGuestId(characterId)) {
      const guestChar = getGuestCharacter(characterId);
      if (!guestChar) {
        alert('체험 모드 캐릭터는 창을 닫으면 사라져요.');
        router.push('/');
        return;
      }
      setIsGuest(true);
      setCharacter(guestChar);
      memoryRef.current = getGuestMemory(characterId);
      setMessages(getGuestMessages(characterId));
      return;
    }

    let user = null;
    try {
      ({ data: { user } } = await supabase.auth.getUser());
    } catch {}

    const { data: charData } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle();

    if (!charData) {
      alert('캐릭터를 찾을 수 없어요. 비공개로 바뀌었거나 삭제됐을 수 있어요.');
      router.push('/');
      return;
    }
    const { memory_pairs: memoryPairs, ...charInfo } = charData;
    memoryRef.current = Array.isArray(memoryPairs) ? memoryPairs : [];
    setCharacter(charInfo);

    if (!user) {
      setIsGuest(true);
      setMessages(getGuestMessages(characterId));
      return;
    }

    // 대화방은 사용자마다 따로
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert([{ character_id: characterId, user_id: user.id }])
        .select()
        .single();
      session = newSession;
    }

    if (session) {
      setSessionId(session.id);

      const { data: msgHistory } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (msgHistory) setMessages(msgHistory);
    }
  };

  useEffect(() => {
    // 마운트 시 1회 데이터 불러오기 (외부 저장소와 동기화)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (characterId) initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // 카톡 캐릭터: 지금 메시지와 비슷했던 상황에서의 실제 대답 찾기 (의미 → 실패하면 글자 비교)
  const recall = async (text) => {
    const pairs = memoryRef.current;
    if (character.source !== 'kakao' || !pairs.length) return [];
    let queryVec = null;
    if (pairs.some((p) => p.v)) {
      try {
        queryVec = (await embedTexts([text]))?.[0] || null;
      } catch {}
    }
    return findMemories(pairs, text, { queryVec });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setLoading(true);
    setError('');

    const newMsgs = [...messages, { sender: 'user', content: userMsg }];
    setMessages(newMsgs);

    try {
      const memories = await recall(userMsg);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          character,
          history: messages.slice(-10),
          memories,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        // 카톡 캐릭터는 줄바꿈을 말풍선 여러 개로 나눠 보여줌
        const parts =
          character.source === 'kakao'
            ? data.reply.split('\n').map((t) => t.trim()).filter(Boolean)
            : [data.reply];
        const botMsgs = parts.map((content) => ({ sender: 'bot', content }));
        const updated = [...newMsgs, ...botMsgs];
        setMessages(updated);
        if (sessionId) {
          const { error } = await supabase.from('messages').insert([
            { session_id: sessionId, sender: 'user', content: userMsg },
            ...botMsgs.map((m) => ({ session_id: sessionId, ...m })),
          ]);
          if (error) console.error('대화 저장 실패:', error);
        } else {
          setGuestMessages(characterId, updated);
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('전송 실패:', err);
      setError('전송에 실패했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (!character) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.typing} aria-label="불러오는 중">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  const profileImage = character.avatar_url || DEFAULT_AVATAR;
  const tags = (character.personality || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  const canSend = input.trim() && !loading;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button type="button" className={styles.back} onClick={() => router.push('/')} aria-label="목록으로">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.headerProfile}
            onClick={() => router.push(`/character/${character.id}`)}
            title="캐릭터 정보 보기"
          >
            <img
              className={styles.headerAvatar}
              src={profileImage}
              alt=""
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <span className={styles.headerText}>
              <span className={styles.headerName}>{character.name}</span>
              <span className={styles.headerMeta}>{[tags.join(', '), character.tone].filter(Boolean).join(' · ')}</span>
            </span>
          </button>
        </div>
      </header>

      <main className={styles.messages} ref={scrollRef}>
        <div className={styles.thread}>
          {isGuest && (
            <GuestNotice what="이 대화는" onLogin={() => router.push('/login?mode=signup')} />
          )}

          <div className={styles.intro}>
            <img className={styles.introAvatar} src={profileImage} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
            <h2 className={styles.introName}>{character.name}</h2>
            <div className={styles.introTags}>
              {tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
              {character.tone && <span className={`${styles.tag} ${styles.tagTone}`}>{character.tone}</span>}
            </div>
            {!messages.length && <p className={styles.introHint}>먼저 말을 걸어 보세요!</p>}
          </div>

          {messages.map((m, i) => {
            const isUser = m.sender === 'user';
            const firstOfGroup = i === 0 || messages[i - 1].sender !== m.sender;
            return (
              <div
                key={m.id || i}
                className={`${styles.row} ${isUser ? styles.rowUser : styles.rowBot} ${firstOfGroup ? styles.rowFirst : ''}`}
              >
                {!isUser && (
                  firstOfGroup ? (
                    <img className={styles.bubbleAvatar} src={profileImage} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  ) : (
                    <span className={styles.avatarSpacer} />
                  )
                )}
                <div className={styles.bubbleCol}>
                  {!isUser && firstOfGroup && <span className={styles.sender}>{character.name}</span>}
                  <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleBot}`}>{m.content}</div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className={`${styles.row} ${styles.rowBot} ${styles.rowFirst}`}>
              <img className={styles.bubbleAvatar} src={profileImage} alt="" />
              <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                <div className={styles.typing} aria-label="답장 쓰는 중">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </main>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className={styles.composerInner}>
          <input
            type="text"
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`${character.name}에게 메시지 보내기`}
            aria-label="메시지"
          />
          <button type="submit" className={styles.send} disabled={!canSend} aria-label="보내기">
            <ArrowUp size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
