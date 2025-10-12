# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 의사소통 규칙

**필수**: 모든 의사소통은 반드시 **한국어로만** 진행할 것.

**제안 프로세스**:
1. 제안할 것이 있을 때는 **옵션을 먼저 제시**
2. **사용자 컨펌을 받은 후** 작업 진행
3. 컨펌 없이 작업을 시작하지 말 것

## 개발 명령어

```bash
# 개발 서버 실행 (localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# ESLint 실행
npm run lint
```

## 환경 변수

프로젝트에는 `.env.local` 파일이 필요합니다:

```bash
# OpenAI API (필수)
OPENAI_API_KEY=your_openai_key

# Supabase 블로그 데이터베이스 (서버 사이드)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase 블로그 데이터베이스 (클라이언트 사이드)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 핵심 아키텍처

### 1. BlockNote 에디터 + AI 통합

이 프로젝트는 **BlockNote 에디터**와 **OpenAI GPT**를 통합한 AI 텍스트 리라이팅 시스템입니다.

**핵심 컴포넌트**:
- `components/BlockNoteEditorWithAI.tsx`: BlockNote 에디터 래퍼
- `components/ChatInterface.tsx`: AI 채팅 인터페이스 및 블록 처리 로직
- `app/api/rewrite/route.ts`: OpenAI API 통합
- `app/page.tsx`: 메인 페이지 (새 포스팅 + 포스팅 관리 탭)

### 2. 위치 기반 블록 재구성 시스템 (Critical)

**문제**: BlockNote 에디터에서 AI가 텍스트 블록만 처리할 때, 이미지와 서식이 사라지거나 위치가 틀어지는 문제

**해결책**: Position-based block reconstruction

**구현 위치**: `components/ChatInterface.tsx`

```typescript
// extractTextBlocks(): 블록 추출 시 위치 추적
const extractTextBlocks = () => {
  textBlocks.push({
    text: textContent,
    type: block.type,
    position: index,        // ⭐ 원본 위치 저장
    isEmpty: !textContent.trim(),
    content: block.content  // ⭐ 원본 서식 보존
  });

  preservedElements.push({
    block: block,           // 이미지, 테이블 등
    position: index         // ⭐ 원본 위치 저장
  });
};

// updateEditorContent(): 위치 기반 재구성
const updateEditorContent = async (processedBlocks, preservedElements) => {
  const allBlocks = [];

  // 위치별로 블록 배치
  preservedElements.forEach(el => {
    allBlocks[el.position] = { type: 'preserved', block: el.block };
  });

  processedBlocks.forEach(pb => {
    allBlocks[pb.position] = { type: 'processed', block: pb };
  });

  // 위치 순서대로 재구성
  allBlocks.forEach((item) => {
    if (item.type === 'preserved') {
      newBlocks.push(item.block);  // 이미지는 그대로
    } else {
      // 텍스트는 AI 처리 후 원본 서식 복원
      const originalStyles = item.block.content[0]?.styles || {};
      newBlocks.push({
        type: item.block.type,
        content: [{
          type: 'text',
          text: item.block.text,
          styles: originalStyles  // ⭐ 서식 보존
        }]
      });
    }
  });
};
```

**주의사항**:
- 빈 블록도 반드시 포함해야 위치가 틀어지지 않음
- `position` 필드로 원본 위치 추적 필수
- `content[0].styles` 객체를 통해 bold/italic 등 서식 보존

### 3. 에디터 동기화 대기 (Critical)

**문제**: `replaceBlocks()` 호출 후 즉시 다음 작업을 하면 이전 상태를 읽음 (race condition)

**해결책**: Active waiting with document comparison

```typescript
// 에디터 업데이트
const oldDocument = JSON.stringify(editorRef.current.document);
editorRef.current.replaceBlocks(editorRef.current.document, newBlocks);

// ⭐ 업데이트 완료까지 대기 (최대 500ms)
let attempts = 0;
while (attempts < 10) {
  await new Promise(resolve => setTimeout(resolve, 50));
  const newDocument = JSON.stringify(editorRef.current.document);
  if (newDocument !== oldDocument) {
    console.log('✅ Editor updated successfully');
    break;
  }
  attempts++;
}
```

**적용 위치**: `ChatInterface.tsx`의 모든 `handleAction` 함수

### 4. Supabase 블로그 연동

**구조**:
- `lib/supabase.ts`: Supabase 클라이언트 및 타입 정의
- `app/api/posts/route.ts`: 포스트 목록 조회
- `app/api/posts/[id]/route.ts`: 포스트 상세 조회/수정/삭제
- `app/api/publish-blog/route.ts`: 블로그 포스팅 발행

**데이터베이스 테이블**:
- `blog_posts`: 블로그 포스트
- `blog_categories`: 카테고리

### 5. Tailwind 컨테이너 설정

프로젝트는 홈페이지 디자인 시스템을 따릅니다:

```javascript
// tailwind.config.js
container: {
  center: true,  // 자동 mx-auto
  padding: {
    DEFAULT: '1rem',
    sm: '1.5rem',
    md: '2rem',
    lg: '3rem',
    xl: '4rem',
    '2xl': '5rem'
  },
  screens: {
    xl: '1200px',
    '2xl': '1280px'
  }
}
```

**컴포넌트 사용**:
```tsx
// ✅ 올바른 사용
<div className="container max-w-7xl">

// ❌ 잘못된 사용 (수동 패딩/마진 불필요)
<div className="container max-w-7xl mx-auto px-4">
```

## API 라우트 구조

### POST /api/rewrite

AI 텍스트 리라이팅 API

**Request**:
```json
{
  "textBlocks": [
    {
      "id": "block_0",
      "text": "텍스트 내용",
      "type": "paragraph",
      "position": 0,
      "content": [...]
    }
  ],
  "action": "translate" | "grammar" | "expand" | "simplify" | "professional" | "seo" | "custom",
  "customInstruction": "커스텀 요청 내용 (action=custom일 때)"
}
```

**Response**:
```json
{
  "processedBlocks": [
    {
      "id": "block_0",
      "text": "처리된 텍스트",
      "type": "paragraph"
    }
  ]
}
```

**지원 액션**:
- `translate`: 한영/영한 번역
- `grammar`: 맞춤법 교정
- `expand`: 내용 확장
- `simplify`: 단순화
- `professional`: 전문적인 어조
- `seo`: SEO 최적화
- `custom`: 사용자 정의 요청

### GET /api/posts

블로그 포스트 목록 조회 (검색 지원)

**Query Parameters**:
- `search`: 검색어 (제목 검색)

### GET /api/posts/[id]

포스트 상세 조회

### PUT /api/posts/[id]

포스트 수정

**Request**:
```json
{
  "title": "제목",
  "content": "BlockNote JSON",
  "category_id": "카테고리 ID"
}
```

### DELETE /api/posts/[id]

포스트 삭제

### POST /api/publish-blog

새 포스트 발행

**Request**:
```json
{
  "title": "제목",
  "content": "BlockNote JSON",
  "category_id": "카테고리 ID"
}
```

## 중요 패턴 및 주의사항

### 1. BlockNote 에디터 SSR 방지

```tsx
// ✅ 반드시 dynamic import 사용
const BlockNoteEditorWithAI = dynamic(
  () => import('../components/BlockNoteEditorWithAI'),
  { ssr: false }
);
```

### 2. 탭 전환 시 상태 초기화

"새 포스팅" 탭으로 전환 시 이전 포스트 데이터 초기화:

```tsx
<button onClick={() => {
  setActiveTab('create');
  setEditingPostId(null);
  setPostTitle('');
  setSelectedCategory('');
  if (editorRef.current?.replaceBlocks) {
    editorRef.current.replaceBlocks(
      editorRef.current.document,
      [{ type: 'paragraph', content: '' }]
    );
  }
}}>
```

### 3. 채팅 메시지 UI 구분

사용자와 AI 메시지를 좌우로 구분:

```tsx
<div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
  <div className={`p-3 rounded-lg max-w-[85%] ${
    message.type === 'user'
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted'
  }`}>
    {message.content}
  </div>
</div>
```

### 4. 로고 사이즈 표준

홈페이지 디자인 시스템 준수:

```tsx
<Image
  src="/logo-light.webp"
  className="h-8 md:h-10 w-auto"  // 반응형 높이
/>
<h1 className="text-base md:text-lg font-medium">
  AI 리라이터
</h1>
```

## 디버깅 팁

### 블록 처리 디버깅

`ChatInterface.tsx`에 디버그 로그가 있습니다:

```typescript
console.log(`[${action}] Extracted text blocks:`,
  textBlocks.map(b => ({ id: b.id, text: b.text.substring(0, 50) }))
);
```

번역/스타일 변환 후 영어가 다시 나타나면 에디터 동기화 문제입니다.

### 서식/이미지 손실 디버깅

1. `position` 필드가 모든 블록에 있는지 확인
2. `preservedElements`에 이미지가 올바른 position으로 저장되는지 확인
3. `allBlocks` 배열이 position 순서대로 올바르게 채워지는지 확인

## 프로젝트 특성

- **Next.js 14 App Router** 사용
- **TypeScript** 엄격 모드
- **Tailwind CSS** 디자인 시스템
- **BlockNote v0.41.1** 에디터
- **OpenAI GPT-3.5-turbo** AI 모델
- **Supabase** 외부 블로그 데이터베이스
