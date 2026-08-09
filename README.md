💻 요구 사항 및 설치/실행방법
1. 요구 사항 (Prerequisites)
이 프로젝트를 클론하여 로컬 환경에서 실행하려면 다음 프로그램이 설치되어 있어야 합니다.

Node.js: v18.0.0 이상 권장

npm: v9.0.0 이상 권장

2. 환경 변수 설정 (.env.local)
프로젝트 루트 경로에 .env.local 파일을 생성하고 아래 키를 설정해 주세요.

코드 스니펫
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
3. 설치 및 실행 (Installation & Setup)
Bash
# 1. Repository 클론
git clone [https://github.com/사용자이름/ai-character-chat.git](https://github.com/사용자이름/ai-character-chat.git)

# 2. 프로젝트 디렉토리 이동
cd ai-character-chat

# 3. 의존성 패키지 설치
npm install

# 4. 개발 서버 실행
npm run dev
🛠️ 기술 스택 (Tech Stack)
Framework: Next.js 15+ (App Router)

Language: JavaScript (ES6+)

Backend & Database: Supabase (Database, Auth, Storage)

AI Model: Google Gemini API (gemini-2.0-flash-lite)

Styling: Inline CSS (Clean Mobile First Layout)
