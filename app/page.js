'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    const { data } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
    if (data) setCharacters(data);
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🎭 AI 캐릭터 목록</h2>
        <Link href="/create" style={{ background: '#6c5ce7', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
          + 새 캐릭터 생성
        </Link>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {characters.length === 0 ? (
          <p style={{ color: '#888' }}>아직 생성된 캐릭터가 없습니다. 새 캐릭터를 만들어보세요!</p>
        ) : (
          characters.map((c) => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #ddd', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0' }}>{c.name} ({c.age}, {c.gender})</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{c.personality} / {c.tone}</p>
              </div>
              <Link href={`/chat/${c.id}`} style={{ background: '#f1f2f6', color: '#2f3542', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }}>
                대화하기 💬
              </Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}