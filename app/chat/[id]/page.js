'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChatPage({ params }) {
  // Next.js 15+ 비동기 params 처리
  const resolvedParams = use(params);
  const characterId = resolvedParams.id;

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
    // 1. 캐릭터 정보 조회
    const { data: charData } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle();

    if (charData) setCharacter(charData);

    // 2. 대화 세션 조회 (single 대신 maybeSingle 사용하여 에러 방지)
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle();

    // 세션이 없으면 새로 생성
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

      // 3. 기존 대화 기록 조회
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

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <header style={{ padding: '16px', background: '#6c5ce7', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
        💬 {character.name}
      </header>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              background: m.sender === 'user' ? '#6c5ce7' : '#fff',
              color: m.sender === 'user' ? '#fff' : '#000',
              padding: '10px 14px',
              borderRadius: '12px',
              maxWidth: '80%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <p style={{ color: '#888', fontSize: '13px' }}>답변을 생각하는 중...</p>}
      </div>

      <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지를 입력하세요..."
          style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }}
        />
        <button onClick={handleSend} style={{ background: '#6c5ce7', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer' }}>
          전송
        </button>
      </div>
    </main>
  );
}