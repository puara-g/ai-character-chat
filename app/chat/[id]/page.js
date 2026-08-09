'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    if (characterId) {
      initChat();
    }
  }, [characterId]);

  const initChat = async () => {
    const { data: charData } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle();

    if (charData) setCharacter(charData);

    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle();

    if (!session) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert([{ character_id: characterId }])
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
        body: JSON.stringify({ message: userMsg, sessionId, character }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages([...newMsgs, { sender: 'bot', content: data.reply }]);
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