'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CreateCharacter() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', gender: '여성', age: '20대', personality: '다정하고 친절함', tone: '친근한 반말', detail: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('이름을 입력해주세요!');

    // Supabase에 데이터 삽입 시도
    const { data, error } = await supabase.from('characters').insert([form]).select();

    if (error) {
      console.error('Supabase 에러 상세:', error);
      // 🔥 실패 원인을 화면 팝업으로 직접 띄웁니다!
      alert(`[오류 원인]\n메시지: ${error.message}\n상세: ${error.details || '없음'}\n코드: ${error.code}`);
    } else if (data && data.length > 0) {
      router.push(`/chat/${data[0].id}`);
    } else {
      alert('데이터가 반환되지 않았습니다.');
    }
    // 캐릭터 저장 버튼 누를 때 코드 예시
const handleCreateCharacter = async () => {
  // 1. 현재 유저 구하기
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 2. user_id를 포함해서 insert
  const { data, error } = await supabase.from('characters').insert([
    {
      name: name,
      gender: gender,
      personality: personality,
      tone: tone,
      user_id: user.id, // 👈 로그인된 유저의 ID를 꼭 넣어줍니다!
    }
  ]);
  
  if (!error) {
    router.push('/');
  }
};
  };

  return (
    <main style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #ddd' }}>
      <h2>🎭 나만의 AI 캐릭터 만들기</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>이름</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 루나" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>성별</label>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}>
            <option value="여성">여성</option>
            <option value="남성">남성</option>
            <option value="기타/중성">기타 / 중성</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>나이</label>
          <select value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}>
            <option value="10대">10대</option>
            <option value="20대">20대</option>
            <option value="30~40대">30~40대</option>
            <option value="수백 살 이상">수백 살 이상</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>성격</label>
          <input type="text" value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>말투</label>
          <input type="text" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>추가 설정</label>
          <textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="직업, 비밀, 배경스토리 등" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', height: '80px' }} />
        </div>
        <button type="submit" style={{ background: '#6c5ce7', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          생성하고 대화 시작하기 💬
        </button>
      </form>
    </main>
  );
}