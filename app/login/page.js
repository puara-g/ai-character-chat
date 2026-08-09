'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchCharacters();
  }, []);

  const checkUserAndFetchCharacters = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);

    const { data: myCharacters } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (myCharacters) setCharacters(myCharacters);
    setLoading(false);
  };

  // 💡 캐릭터 삭제 처리 함수
  const handleDeleteCharacter = async (e, charId, charName) => {
    // 카드를 클릭했을 때 채팅방으로 이동하지 않도록 이벤트 전파 막기
    e.stopPropagation();

    if (!confirm(`'${charName}' 캐릭터를 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`)) {
      return;
    }

    try {
      // 1. characters 테이블에서 해당 ID 삭제
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', charId);

      if (error) throw error;

      // 2. 화면 UI에서도 해당 캐릭터 제거
      setCharacters((prev) => prev.filter((char) => char.id !== charId));
      alert('캐릭터가 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert(`삭제 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>로딩 중...</p>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '40px 20px' }}>
      <main style={{ maxWidth: '520px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#191f28' }}>
            내 AI 캐릭터 <span style={{ color: '#6c5ce7' }}>{characters.length}</span>
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => router.push('/create')}
              style={{ padding: '9px 16px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 12px rgba(108, 92, 231, 0.2)' }}
            >
              + 캐릭터 만들기
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '9px 14px', background: '#f2f4f6', color: '#4e5968', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 캐릭터 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {characters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#8b95a1', background: '#fff', borderRadius: '20px', border: '1px solid #f2f4f6' }}>
              <p style={{ marginBottom: '16px', fontSize: '15px' }}>아직 만든 AI 캐릭터가 없습니다.</p>
              <button
                onClick={() => router.push('/create')}
                style={{ padding: '10px 18px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                새 캐릭터 추가하기
              </button>
            </div>
          ) : (
            characters.map((char) => {
              const avatarSrc = char.avatar_url || DEFAULT_AVATAR;

              return (
                <div
                  key={char.id}
                  onClick={() => router.push(`/chat/${char.id}`)}
                  style={{
                    padding: '16px 20px',
                    background: '#ffffff',
                    border: '1px solid #f2f4f6',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {/* 프로필 이미지 */}
                  <img
                    src={avatarSrc}
                    alt={char.name}
                    onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid #e5e8eb',
                      flexShrink: 0,
                    }}
                  />

                  {/* 캐릭터 정보 영역 */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#191f28' }}>
                        {char.name}
                      </h4>
                      
                      {/* 💡 삭제 버튼 영역 */}
                      <button
                        onClick={(e) => handleDeleteCharacter(e, char.id, char.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#8b95a1',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#f04452'}
                        onMouseLeave={(e) => e.target.style.color = '#8b95a1'}
                        title="캐릭터 삭제"
                      >
                        🗑️ 삭제
                      </button>
                    </div>

                    {/* 태그 영역 */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6c5ce7',
                          background: '#f1f0fe',
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        {char.personality}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#4e5968',
                          background: '#f2f4f6',
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        {char.tone}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}