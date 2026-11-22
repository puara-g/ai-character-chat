'use client';

import { useState } from 'react';
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { parseKakao, listParticipants, buildProfile } from '@/lib/kakao';
import styles from './create.module.css';

const MAX_FILE = 50 * 1024 * 1024;

const readText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });

/** 카톡 대화 파일을 읽고 따라 할 사람을 고르면 onPick({ target, profile }) 호출 */
export default function KakaoImport({ onPick }) {
  const [fileName, setFileName] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [target, setTarget] = useState('');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    if (file.size > MAX_FILE) {
      setError('파일이 너무 커요. 50MB 이하만 올릴 수 있어요.');
      return;
    }

    try {
      const parsed = parseKakao(await readText(file));
      const people = listParticipants(parsed);
      if (parsed.length < 10 || people.length < 2) {
        setError('카톡 대화 내용을 찾지 못했어요. 카카오톡에서 "대화 내보내기"로 저장한 .txt 또는 .csv 파일인지 확인해 주세요.');
        return;
      }
      setFileName(file.name);
      setMessages(parsed);
      setParticipants(people);
      setTarget('');
      setProfile(null);
      onPick(null);
    } catch {
      setError('파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.');
    }
  };

  const pick = (name) => {
    const built = buildProfile(messages, name);
    setTarget(name);
    setProfile(built);
    onPick(built.stats.messages >= 10 ? { target: name, profile: built } : null);
  };

  return (
    <div>
      {!fileName ? (
        <label className={styles.filePick}>
          <span className={styles.filePickIcon}>
            <FileText size={20} aria-hidden="true" />
          </span>
          <span className={styles.optionText}>
            <span className={styles.optionTitle}>카톡 대화 파일 선택</span>
            <span className={styles.optionDesc}>카카오톡에서 내보낸 .txt 또는 .csv 파일</span>
          </span>
          <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} hidden />
        </label>
      ) : (
        <div className={styles.fileRow}>
          <FileText size={18} aria-hidden="true" />
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.fileMeta}>메시지 {messages.length.toLocaleString()}개</span>
          <label className={styles.fileChange}>
            <RefreshCw size={14} aria-hidden="true" />
            바꾸기
            <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} hidden />
          </label>
        </div>
      )}

      {error && <p className={styles.fieldError}>{error}</p>}

      {!fileName && (
        <p className={styles.help}>
          내보내는 법: 카카오톡 채팅방 → 오른쪽 위 메뉴 → 설정(톱니바퀴) → <b>대화 내용 내보내기</b> → 텍스트만 보내기.
          PC는 채팅방 메뉴 → <b>대화 내용 → 대화 내보내기</b>.
        </p>
      )}

      {participants.length > 0 && (
        <div className={styles.peopleBlock}>
          <span className={styles.label}>
            누구의 말투를 따라 할까요?<span className={styles.req}>*</span>
          </span>
          <div className={styles.people} role="radiogroup" aria-label="따라 할 사람">
            {participants.slice(0, 12).map((p) => (
              <button
                key={p.name}
                type="button"
                role="radio"
                aria-checked={target === p.name}
                className={`${styles.person} ${target === p.name ? styles.personOn : ''}`}
                onClick={() => pick(p.name)}
              >
                <span className={styles.personName}>{p.name}</span>
                <span className={styles.personCount}>{p.count.toLocaleString()}개</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {profile && (
        <div className={styles.analysis}>
          {profile.stats.messages < 10 ? (
            <p className={styles.fieldError}>{target}님의 메시지가 너무 적어요. 다른 사람을 골라 주세요.</p>
          ) : (
            <>
              <p className={styles.analysisTitle}>
                {target}님의 메시지 {profile.stats.messages.toLocaleString()}개, 주고받은 대화 {profile.stats.pairs.toLocaleString()}쌍을 찾았어요
              </p>
              <div className={styles.samples}>
                {profile.styleExamples.slice(-4).map((t) => (
                  <span key={t} className={styles.sample}>
                    {t}
                  </span>
                ))}
              </div>
              {profile.styleSummary && <p className={styles.analysisSub}>{profile.styleSummary}</p>}
            </>
          )}
        </div>
      )}

      <p className={styles.privacy}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          파일은 서버로 올라가지 않고 이 브라우저에서만 읽어요. 고른 사람의 메시지 일부만 저장하고 전화번호·링크·계좌번호는 가려요.
          대화할 때는 이 내용이 Google AI로 전송돼요.
        </span>
      </p>
    </div>
  );
}
