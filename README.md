```markdown
# 🤖 AI Character Chat (AI 캐릭터 대화 서비스)

> **Next.js & Supabase & Gemini API 기반 AI 페르소나 캐릭터 챗봇**
> 
> 사용자가 직접 이름, 성격, 말투, 상세 배경을 설정해 커스텀 AI 캐릭터를 생성하고, 개별적인 1:1 대화를 즐길 수 있는 웹 플랫폼입니다.

<br>

## 📝 프로젝트 소개

`AI Character Chat`은 사용자가 자신이 원하는 AI 페르소나를 직접 디자인하고 실시간으로 대화할 수 있는 **웹 기반 커스텀 챗봇 서비스**입니다.

간단한 정보 입력과 이미지 첨부만으로 나만의 AI 캐릭터를 생성할 수 있으며, 구글의 최신 **Gemini API (`gemini-2.0-flash-lite`)** 및 **Supabase Storage/Database**를 연동하여 초고속 대화 응답 속도와 안정적인 데이터 보관을 제공합니다. 모바일 퍼스트 및 카카오톡 뷰를 벤치마킹하여 초보자도 직관적으로 사용할 수 있는 UI/UX를 구축했습니다.

<br>

## ✨ 핵심 기능

* **커스텀 AI 캐릭터 생성**: 이름, 성격, 말투, 상세 배경 및 프로필 이미지 설정
* **실시간 AI 챗봇 대화**: 설정된 페르소나에 완벽히 몰입하여 자연스러운 대화 제공 (Gemini API 기반)
* **이미지 업로드 & 검증**: Supabase Storage 연동 (크기 및 MIME 타입 제한 적용)
* **대화 세션 및 내역 관리**: Supabase Database를 통한 사용자별 챗봇 세션/메시지 내역 유지
* **직관적인 모바일 UI**: 깔끔한 뱃지/태그 디자인, 뒤로가기 및 캐릭터 삭제 기능 지원

<br>

## 📂 파일 및 폴더 구조 (Directory Structure)

```text
ai-character-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.js          # Gemini API 호출 및 페르소나 프롬프트 처리 API
│   ├── chat/
│   │   └── [id]/
│   │       └── page.js           # 1:1 AI 캐릭터 대화방 페이지 (헤더, 메시지, 입력창)
│   ├── create/
│   │   └── page.js               # 새 AI 캐릭터 생성 페이지 (이미지 검증 및 커스텀 폼)
│   ├── login/
│   │   └── page.js               # 로그인 / 회원가입 페이지
│   ├── layout.js                 # 전체 레이아웃 설정
│   └── page.js                   # 메인 페이지 (내 AI 캐릭터 목록, 삭제 기능)
├── lib/
│   └── supabase.js               # Supabase 클라이언트 설정 파일
├── public/                       # 파비콘 및 정적 자원
├── .env.local                    # 환경 변수 (Supabase, Gemini API Key)
├── package.json                  # 프로젝트 의존성 관리 파일
└── README.md                     # 프로젝트 문서
```

<br>

## 💻 요구 사항 및 설치/실행방법

### 1. 요구 사항 (Prerequisites)

이 프로젝트를 클론하여 로컬 환경에서 실행하려면 다음 프로그램이 설치되어 있어야 합니다.

* **Node.js**: `v18.0.0` 이상 권장
* **npm**: `v9.0.0` 이상 권장

### 2. 환경 변수 설정 (`.env.local`)

프로젝트 루트 경로에 `.env.local` 파일을 생성하고 아래 키를 설정해 주세요.

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. 설치 및 실행 (Installation & Setup)

```bash
# 1. Repository 클론
git clone [https://github.com/사용자이름/ai-character-chat.git](https://github.com/사용자이름/ai-character-chat.git)

# 2. 프로젝트 디렉토리 이동
cd ai-character-chat

# 3. 의존성 패키지 설치
npm install

# 4. 개발 서버 실행
npm run dev
```

<br>

## 🛠️ 기술 스택 (Tech Stack)

* **Framework**: Next.js 15+ (App Router)
* **Language**: JavaScript (ES6+)
* **Backend & Database**: Supabase (Database, Auth, Storage)
* **AI Model**: Google Gemini API (`gemini-2.0-flash-lite`)
* **Styling**: Inline CSS (Clean Mobile First Layout)
```
