# BlockNote AI 리라이터

BlockNote 에디터와 AI 채팅을 연계한 텍스트 리라이팅 애플리케이션입니다.

## 주요 기능

- **실시간 텍스트 리라이팅**: AI를 통한 번역, 어조 개선, 요약, 맞춤법 교정
- **서식 보존**: 이미지, 테이블, 링크 등의 서식 요소 유지
- **채팅 인터페이스**: 자연어로 커스텀 리라이팅 요청
- **빠른 액션**: 원클릭 번역, 어조 개선 등

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **에디터**: BlockNote (Notion-style editor)
- **AI**: OpenAI GPT-3.5-turbo
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React

## 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
`.env.local` 파일에 OpenAI API 키가 이미 설정되어 있습니다.

3. 개발 서버 실행:
```bash
npm run dev
```

4. 브라우저에서 `http://localhost:3000` 접속

## 사용 방법

1. **텍스트 입력**: 왼쪽 에디터에 텍스트, 이미지, 표 등을 자유롭게 작성
2. **리라이팅 요청**: 오른쪽 채팅에서 빠른 액션 버튼 클릭 또는 직접 요청 입력
3. **결과 확인**: AI가 텍스트만 수정하고 다른 요소들은 그대로 보존

## 주요 컴포넌트

- `BlockNoteEditor`: BlockNote 에디터 래퍼
- `ChatInterface`: AI 채팅 인터페이스
- `/api/rewrite`: OpenAI API 연동 엔드포인트

## 라이선스

MIT License