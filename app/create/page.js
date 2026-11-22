'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { addGuestCharacter } from '@/lib/guest';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// 체험 모드에서는 이미지를 업로드하지 않고 data URL로 탭에 보관
const readAsDataUrl = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

export default function CreateCharacterPage() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('여성');
  const [personality, setPersonality] = useState('');
  const [tone, setTone] = useState('');
  const [detail, setDetail] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // 💡 이미지 미리보기 URL
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 파일 선택 및 미리보기 생성
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 크기는 2MB 이하만 업로드 가능합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file)); // 이미지 미리보기 세팅
  };

  const uploadAvatarImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`);

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 로그인 안 했으면 체험 모드: 이 탭에만 임시 저장
      if (!user) {
        const avatarUrl = imageFile ? await readAsDataUrl(imageFile) : null;
        addGuestCharacter({ name, gender, personality, tone, detail, avatar_url: avatarUrl });
        router.push('/');
        return;
      }

      let avatarUrl = null;
      if (imageFile) {
        avatarUrl = await uploadAvatarImage(imageFile);
      }

      const { error: dbError } = await supabase.from('characters').insert([
        {
          name,
          gender,
          personality,
          tone,
          detail,
          avatar_url: avatarUrl,
          user_id: user.id,
        },
      ]);

      if (dbError) throw new Error(`생성 실패: ${dbError.message}`);

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <main
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#191f28', margin: '0 0 6px 0' }}>
            새 AI 캐릭터 만들기 ✨
          </h2>
          <p style={{ fontSize: '14px', color: '#8b95a1', margin: 0 }}>
            나만의 특별한 AI 친구의 프로필을 설정해 보세요.
          </p>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 💡 프로필 이미지 업로드 영역 (커스텀 아바타 스타일) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <label
              htmlFor="avatar-upload"
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: '#f2f4f6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                border: '2px dashed #dde1e5',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#8b95a1', fontSize: '12px' }}>
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '2px' }}>📷</span>
                  사진 추가
                </div>
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* 캐릭터 이름 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333d4b', marginBottom: '6px' }}>
              캐릭터 이름 <span style={{ color: '#f04452' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="예: 가현"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* 성격 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333d4b', marginBottom: '6px' }}>
              성격 <span style={{ color: '#f04452' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="예: 츤데레, 다정함, 장난기 많음"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* 말투 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333d4b', marginBottom: '6px' }}>
              말투 <span style={{ color: '#f04452' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="예: 친근한 반말, 차분한 존댓말"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* 상세 설명 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333d4b', marginBottom: '6px' }}>
              상세 배경설정 (선택)
            </label>
            <textarea
              placeholder="캐릭터의 비밀, 좋아하는 것, 행동 규칙 등을 입력하세요."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '14px',
              background: loading ? '#a29bfe' : '#6c5ce7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {loading ? '캐릭터 생성 중...' : '캐릭터 만들기'}
          </button>
        </form>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #e5e8eb',
  background: '#f9fafb',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};