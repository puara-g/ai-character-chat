import './tokens.css';

export const metadata = {
  title: 'AI 캐릭터 챗봇',
  description: '나만의 AI 캐릭터와 대화하는 공간',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
