'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, Globe, Lock, MessagesSquare, PenLine, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { addGuestCharacter } from '@/lib/guest';
import GuestNotice from '@/components/GuestNotice';
import styles from './create.module.css';
import { greetingFor, hasBatchim } from './greeting';
import KakaoImport from './KakaoImport';
import CharacterLookup from './CharacterLookup';
import { attachVectors } from '@/lib/embed';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DETAIL = 500;
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const GENDERS = ['여성', '남성', '기타'];
const VISIBILITY_OPTIONS = [
  { value: true, Icon: Globe, title: '공개', desc: '둘러보기에서 누구나 대화할 수 있어요. 대화 내용은 각자만 봐요.' },
  { value: false, Icon: Lock, title: '나만 보기', desc: '내 목록에서만 보여요. 나중에 바꿀 수 있어요.' },
];
const PERSONALITY_PRESETS = ['다정함', '츤데레', '장난기 많음', '시크함', '수줍음', '활발함', '지적임', '엉뚱함'];
const TONE_PRESETS = ['친근한 반말', '차분한 존댓말', '귀여운 말투', '무뚝뚝한 말투', '능글맞은 말투', '사투리'];

// 체험 모드에서는 이미지를 업로드하지 않고 data URL로 탭에 보관
const readAsDataUrl = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

const splitTags = (text) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);


export default function CreateCharacterPage() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('여성');
  const [age, setAge] = useState('');
  const [personality, setPersonality] = useState('');
  const [tone, setTone] = useState('');
  const [detail, setDetail] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  // 'manual': 직접 만들기, 'kakao': 카톡 대화로 만들기
  const [mode, setMode] = useState('manual');
  const [kakao, setKakao] = useState(null); // { target, profile }
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState('');
  // 작품 속 캐릭터를 불러왔으면 작품명 (저작권 안내용)
  const [filledWork, setFilledWork] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setIsGuest(!data?.user))
      .catch(() => setIsGuest(true));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 크기는 2MB 이하만 업로드 가능합니다.');
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  // 성격 칩: 여러 개 선택 (쉼표로 구분된 입력값에 추가/제거)
  const togglePersonality = (preset) => {
    const tags = splitTags(personality);
    const next = tags.includes(preset) ? tags.filter((t) => t !== preset) : [...tags, preset];
    setPersonality(next.join(', '));
  };

  const uploadAvatarImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`);

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleLookupFill = (p) => {
    setName(p.name);
    if (p.gender) setGender(p.gender);
    setAge(p.age || '');
    setPersonality(p.personality || '');
    setTone(p.tone || '');
    setDetail((p.detail || '').slice(0, MAX_DETAIL));
    setFilledWork(p.work || p.name);
    // 다른 작품의 캐릭터는 저작권이 있어서 기본은 나만 보기
    setIsPublic(false);
  };

  const handleKakaoPick = (picked) => {
    setKakao(picked);
    if (picked) setName(picked.target);
  };

  const switchMode = (next) => {
    setMode(next);
    if (next === 'manual') {
      setKakao(null);
      setConsent(false);
    }
  };

  const isKakao = mode === 'kakao';

  // 카톡 캐릭터: 말투 정보 + '상대 말 → 실제 대답' 쌍 (의미 벡터 포함)
  const buildKakaoFields = async () => {
    const { profile } = kakao;
    setProgress('대화 분석 중...');
    const { pairs } = await attachVectors(profile.memoryPairs, (done, total) =>
      setProgress(`대화 분석 중 ${done.toLocaleString()} / ${total.toLocaleString()}`)
    );
    return {
      source: 'kakao',
      style: { examples: profile.styleExamples, summary: profile.styleSummary, multiBubble: profile.multiBubble },
      memory_pairs: pairs,
    };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const profile = {
      name: name.trim(),
      gender,
      age: age.trim() || null,
      personality: personality.trim(),
      tone: tone.trim(),
      detail: detail.trim(),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const extra = isKakao ? await buildKakaoFields() : {};

      // 로그인 안 했으면 체험 모드: 이 탭에만 임시 저장
      if (!user) {
        const avatarUrl = imageFile ? await readAsDataUrl(imageFile) : null;
        const created = addGuestCharacter({ ...profile, ...extra, avatar_url: avatarUrl });
        router.push(`/chat/${created.id}`);
        return;
      }

      const avatarUrl = imageFile ? await uploadAvatarImage(imageFile) : null;

      const { data: created, error: dbError } = await supabase
        .from('characters')
        .insert([{ ...profile, ...extra, avatar_url: avatarUrl, user_id: user.id, is_public: isKakao ? false : isPublic }])
        .select('id')
        .single();

      if (dbError) throw new Error(`생성 실패: ${dbError.message}`);

      router.push(created?.id ? `/chat/${created.id}` : '/');
    } catch (error) {
      console.error(error);
      alert(error.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const personalityTags = splitTags(personality);
  const avatarSrc = previewUrl || DEFAULT_AVATAR;
  const meta = [gender, age.trim() && `${age.trim()}살`].filter(Boolean).join(' · ');
  const canSubmit =
    name.trim() &&
    !loading &&
    (isKakao ? Boolean(kakao) && consent : personality.trim() && tone.trim());
  const stepOffset = isKakao ? 1 : 0;
  // 미리보기 말풍선: 카톡 모드면 그 사람이 실제로 보낸 메시지
  const kakaoSample = kakao?.profile.styleExamples.find((t) => t.length >= 4 && t.length <= 40);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <button type="button" className={styles.back} onClick={() => router.push('/')}>
          <ArrowLeft size={16} aria-hidden="true" />
          목록으로
        </button>
      </div>

      <div className={styles.intro}>
        <h1 className={styles.heading}>새 캐릭터 만들기</h1>
        <p className={styles.sub}>어떤 친구와 대화하고 싶은지 알려주세요. 입력하는 대로 미리보기에 바로 보여요.</p>
      </div>

      <div className={styles.layout}>
        <div>
          {isGuest && (
            <GuestNotice onLogin={() => router.push('/login?mode=signup')} />
          )}

          <div className={styles.modeTabs} role="tablist" aria-label="만드는 방법">
            <button
              type="button"
              role="tab"
              aria-selected={!isKakao}
              className={`${styles.modeTab} ${!isKakao ? styles.modeTabOn : ''}`}
              onClick={() => switchMode('manual')}
            >
              <PenLine size={16} aria-hidden="true" />
              직접 만들기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isKakao}
              className={`${styles.modeTab} ${isKakao ? styles.modeTabOn : ''}`}
              onClick={() => switchMode('kakao')}
            >
              <MessagesSquare size={16} aria-hidden="true" />
              카톡 대화로 만들기
            </button>
          </div>

          <form id="create-form" onSubmit={handleCreate} className={styles.form}>
            {!isKakao && <CharacterLookup onFill={handleLookupFill} />}

            {isKakao && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>
                  <span className={styles.step}>1</span> 카톡 대화 불러오기
                </h2>
                <KakaoImport onPick={handleKakaoPick} />
                {kakao && (
                  <label className={styles.consent}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>
                      실제 사람의 말투를 따라 하는 캐릭터예요. 상대방이 원하지 않을 수 있다는 걸 알고 있고, 개인적인 용도로만 쓸게요.
                    </span>
                  </label>
                )}
              </section>
            )}

            {/* 기본 프로필 */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.step}>{1 + stepOffset}</span> 기본 프로필
              </h2>

              <div className={styles.profileRow}>
                <div className={styles.avatarBox}>
                  <label htmlFor="avatar-upload" className={styles.avatarWrap} aria-label="프로필 사진 선택">
                    <span className={styles.avatar}>
                      {previewUrl ? (
                        <img src={previewUrl} alt="프로필 미리보기" />
                      ) : (
                        <UserRound size={40} strokeWidth={1.6} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles.avatarBadge}>
                      <Camera size={14} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} hidden />
                  {previewUrl ? (
                    <button type="button" className={styles.linkBtn} onClick={removeImage}>
                      사진 지우기
                    </button>
                  ) : (
                    <span className={styles.avatarHint}>사진 추가 · 2MB 이하</span>
                  )}
                </div>

                <div className={styles.fields}>
                  <div className={styles.row2}>
                    <div>
                      <label className={styles.label} htmlFor="name">
                        이름<span className={styles.req}>*</span>
                      </label>
                      <input
                        id="name"
                        className={styles.input}
                        placeholder="캐릭터 이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        required
                      />
                    </div>
                    <div>
                      <label className={styles.label} htmlFor="age">
                        나이<span className={styles.optional}>선택</span>
                      </label>
                      <input
                        id="age"
                        className={styles.input}
                        placeholder="숫자만"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                      />
                    </div>
                  </div>

                  <div>
                    <span className={styles.label}>성별</span>
                    <div className={styles.segment} role="radiogroup" aria-label="성별">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={gender === g}
                          className={`${styles.segBtn} ${gender === g ? styles.segOn : ''}`}
                          onClick={() => setGender(g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 성격 & 말투 */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.step}>{2 + stepOffset}</span> 성격과 말투
                {isKakao && <span className={styles.optional}>선택</span>}
              </h2>
              {isKakao && <p className={styles.help}>비워 두면 카톡 대화에서 드러난 성격과 말투 그대로 대화해요.</p>}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="personality">
                  성격{!isKakao && <span className={styles.req}>*</span>}
                  <span className={styles.optional}>여러 개 고를 수 있어요</span>
                </label>
                <input
                  id="personality"
                  className={styles.input}
                  placeholder="직접 입력하거나 아래에서 골라주세요"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  required={!isKakao}
                />
                <div className={styles.chips}>
                  {PERSONALITY_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.chip} ${personalityTags.includes(p) ? styles.chipOn : ''}`}
                      onClick={() => togglePersonality(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="tone">
                  말투{!isKakao && <span className={styles.req}>*</span>}
                </label>
                <input
                  id="tone"
                  className={styles.input}
                  placeholder="직접 입력하거나 아래에서 골라주세요"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  required={!isKakao}
                />
                <div className={styles.chips}>
                  {TONE_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.chip} ${tone.trim() === t ? styles.chipOn : ''}`}
                      onClick={() => setTone(tone.trim() === t ? '' : t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. 상세 설정 */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.step}>{3 + stepOffset}</span> 상세 설정
                <span className={styles.optional}>선택</span>
              </h2>
              <textarea
                className={styles.textarea}
                placeholder="캐릭터의 배경, 좋아하는 것, 비밀, 지켜야 할 규칙 등을 자유롭게 적어주세요."
                value={detail}
                onChange={(e) => setDetail(e.target.value.slice(0, MAX_DETAIL))}
                rows={4}
              />
              <div className={styles.counter}>
                {detail.length} / {MAX_DETAIL}
              </div>
            </section>

            {/* 4. 공개 설정 */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.step}>{4 + stepOffset}</span> 공개 설정
              </h2>

              <div className={styles.visibility} role="radiogroup" aria-label="공개 설정">
                {VISIBILITY_OPTIONS.map(({ value, Icon, title, desc }) => {
                  const selected = (isGuest || isKakao ? false : isPublic) === value;
                  return (
                    <button
                      key={title}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isGuest || isKakao}
                      className={`${styles.option} ${selected ? styles.optionOn : ''}`}
                      onClick={() => setIsPublic(value)}
                    >
                      <span className={styles.optionIcon}>
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className={styles.optionText}>
                        <span className={styles.optionTitle}>{title}</span>
                        <span className={styles.optionDesc}>{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isKakao && !isGuest && filledWork && (
                <p className={styles.visibilityNote}>
                  {filledWork}의 캐릭터는 원작 저작권이 있어서 나만 보기를 추천해요.
                </p>
              )}
              {isKakao ? (
                <p className={styles.visibilityNote}>
                  카톡 대화로 만든 캐릭터는 실제 사람의 말투가 담겨 있어서 항상 나만 볼 수 있어요.
                </p>
              ) : isGuest && (
                <p className={styles.visibilityNote}>
                  체험 중에는 캐릭터가 저장되지 않아서 공개할 수 없어요.{' '}
                  <button type="button" className={styles.inlineLink} onClick={() => router.push('/login?mode=signup')}>
                    회원가입하기
                  </button>
                </p>
              )}
            </section>
          </form>
        </div>

        {/* 미리보기 */}
        <aside className={styles.previewCol} aria-label="캐릭터 미리보기">
          <p className={styles.previewLabel}>미리보기</p>
          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <img
                className={styles.previewAvatar}
                src={avatarSrc}
                alt=""
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <div className={styles.previewName}>{name.trim() || '이름을 지어주세요'}</div>
              <div className={styles.previewMeta}>{meta}</div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.tags}>
                {personalityTags.map((t) => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
                {tone.trim() && <span className={`${styles.tag} ${styles.tagTone}`}>{tone.trim()}</span>}
                {!personalityTags.length && !tone.trim() && (
                  <span className={styles.tagEmpty}>성격과 말투를 고르면 여기에 표시돼요</span>
                )}
              </div>
              <div className={styles.bubbleRow}>
                <img className={styles.bubbleAvatar} src={avatarSrc} alt="" />
                <div className={styles.bubble}>{kakaoSample || greetingFor(name, tone, personalityTags)}</div>
              </div>
            </div>
          </div>
          <p className={styles.previewFoot}>실제 대화는 설정한 성격·말투·상세 설정을 바탕으로 AI가 만들어요.</p>
        </aside>
      </div>

      <div className={styles.submitBar}>
        <button type="submit" form="create-form" className={styles.submit} disabled={!canSubmit}>
          {loading
            ? progress || '만드는 중...'
            : canSubmit
              ? `${name.trim()}${hasBatchim(name.trim()) ? '과' : '와'} 대화 시작하기`
              : isKakao
                ? !kakao
                  ? '카톡 파일을 올리고 따라 할 사람을 골라주세요'
                  : !consent
                    ? '안내를 확인하고 체크해 주세요'
                    : '이름을 채워주세요'
                : '이름 · 성격 · 말투를 채워주세요'}
        </button>
      </div>
    </div>
  );
}
