export const metadata = {
  title: 'AI 캐릭터 챗봇',
  description: '나만의 AI 캐릭터와 대화하는 공간',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f0f2f5' }}>
        {children}
      </body>
    </html>
  );
}