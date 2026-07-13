'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchCharacters();
  }, []);

  const checkUserAndFetchCharacters = async () => {
    // 1. 현재 로그인된 사용자 확인
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);

    // 2. 로그인한 유저(currentUser.id)의 캐릭터만 조회
    const { data: myCharacters } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (myCharacters) setCharacters(myCharacters);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>로딩 중...</p>;

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>내 AI 캐릭터 목록 🤖</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 💡 캐릭터 만들기 버튼 추가 */}
          <button
            onClick={() => router.push('/create')}
            style={{ padding: '8px 14px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + 캐릭터 만들기
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 캐릭터 목록 UI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {characters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
            <p style={{ marginBottom: '16px' }}>아직 만든 AI 캐릭터가 없습니다.</p>
            <button
              onClick={() => router.push('/create')}
              style={{ padding: '10px 18px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              새 캐릭터 추가하기
            </button>
          </div>
        ) : (
          characters.map((char) => (
            <div
              key={char.id}
              onClick={() => router.push(`/chat/${char.id}`)}
              style={{ padding: '16px', background: '#fff', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer' }}
            >
              <h4 style={{ margin: '0 0 6px 0' }}>{char.name}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{char.personality}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}