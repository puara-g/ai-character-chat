'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { isGuestId, getGuestCharacter, getGuestMessages, setGuestMessages } from '@/lib/guest';
import GuestNotice from '@/components/GuestNotice';

// 💡 프로필 이미지가 없을 때 띄울 기본 이미지
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
    setCharacter(charData);

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setLoading(true);

    const newMsgs = [...messages, { sender: 'user', content: userMsg }];
    setMessages(newMsgs);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          character,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();

      if (data.reply) {
        const updated = [...newMsgs, { sender: 'bot', content: data.reply }];
        setMessages(updated);
        if (sessionId) {
          const { error } = await supabase.from('messages').insert([
            { session_id: sessionId, sender: 'user', content: userMsg },
            { session_id: sessionId, sender: 'bot', content: data.reply },
          ]);
          if (error) console.error('대화 저장 실패:', error);
        } else {
          setGuestMessages(characterId, updated);
        }
      } else if (data.error) {
        alert(`오류 발생: ${data.error}`);
      }
    } catch (err) {
      console.error('전송 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!character) return <p style={{ textAlign: 'center', marginTop: '40px' }}>로딩 중...</p>;

  // 프로필 이미지 (없으면 DEFAULT_AVATAR)
  const profileImage = character.avatar_url || DEFAULT_AVATAR;

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      
      {/* 💡 뒤로가기 버튼이 탑재된 깔끔한 헤더 */}
      <header
        style={{
          padding: '12px 16px',
          background: '#6c5ce7',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '0 8px',
            lineHeight: 1,
          }}
          aria-label="메인 화면으로 이동"
        >
          ←
        </button>

        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: '30px' }}>
          💬 {character.name}
        </h3>
      </header>

      {/* 대화 내역 영역 */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isGuest && (
          <GuestNotice
            what="이 대화는"
            onLogin={() => router.push('/login?mode=signup')}
            style={{ marginBottom: 0 }}
          />
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              gap: '8px',
              maxWidth: '85%',
            }}
          >
            {/* AI 메시지일 경우 왼쪽 프로필 노출 */}
            {m.sender !== 'user' && (
              <img
                src={profileImage}
                alt={character.name}
                onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #ddd',
                  flexShrink: 0,
                }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {m.sender !== 'user' && (
                <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', marginLeft: '2px' }}>
                  {character.name}
                </span>
              )}

              <div
                style={{
                  background: m.sender === 'user' ? '#6c5ce7' : '#fff',
                  color: m.sender === 'user' ? '#fff' : '#000',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  lineHeight: '1.4',
                }}
              >
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
            <img
              src={profileImage}
              alt={character.name}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <p style={{ color: '#888', fontSize: '13px', marginTop: '10px' }}>답변을 생각하는 중...</p>
          </div>
        )}
      </div>

      {/* 하단 입력창 */}
      <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지를 입력하세요..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          style={{ background: '#6c5ce7', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          전송
        </button>
      </div>
    </main>
  );
}