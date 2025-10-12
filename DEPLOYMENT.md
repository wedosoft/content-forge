# 배포 및 환경 변수 설정 가이드

## 🔐 환경 변수 설정 방법

### 로컬 개발 환경

`.env.local` 파일에 설정:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Supabase (서버 사이드 - 블로그 발행용)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase (클라이언트 사이드 - 카테고리 조회용)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Vercel 배포

Vercel Dashboard → Settings → Environment Variables에서 설정:

| 변수명 | 값 | 설명 |
|--------|---|------|
| `OPENAI_API_KEY` | sk-proj-... | OpenAI API 키 |
| `SUPABASE_URL` | https://xxx.supabase.co | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbG... | Service Role Key (절대 클라이언트 노출 금지!) |
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | 클라이언트용 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbG... | 클라이언트용 Anon Key |

## 🔒 보안 주의사항

### ✅ 안전한 방식 (현재 구조)

**블로그 발행**:
- ❌ 클라이언트에서 직접 Supabase 접근 (이전 방식)
- ✅ Next.js API Route (`/api/publish-blog`) 사용 (현재 방식)
- ✅ 서버에서만 Service Role Key 사용
- ✅ RLS 정책 우회 가능 (안전한 서버 환경에서만)

**카테고리 조회**:
- ✅ 클라이언트에서 Anon Key로 조회
- ✅ RLS 정책으로 읽기 전용 제한

### 🔑 환경 변수 타입별 설명

#### 1. 서버 전용 환경 변수 (안전)
- `OPENAI_API_KEY` - API Route에서만 사용
- `SUPABASE_URL` - 서버 사이드 블로그 발행
- `SUPABASE_SERVICE_ROLE_KEY` - RLS 우회 (서버만 접근)

#### 2. 클라이언트 노출 환경 변수 (제한적 권한)
- `NEXT_PUBLIC_SUPABASE_URL` - 공개 가능
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - RLS로 제한된 읽기 권한만

## 📊 데이터 흐름

### 블로그 발행 플로우

```
[클라이언트]                [Next.js API]              [Supabase]
    |                           |                          |
    | POST /api/publish-blog    |                          |
    |-------------------------->|                          |
    |    { title, content,      |                          |
    |      category_id }        |                          |
    |                           | Service Role Key         |
    |                           |------------------------->|
    |                           |   INSERT blog_posts      |
    |                           |                          |
    |                           |<-------------------------|
    |                           |   { success, post }      |
    |<--------------------------|                          |
    |   { message, post }       |                          |
```

### 카테고리 조회 플로우

```
[클라이언트]                                    [Supabase]
    |                                               |
    | supabaseBlog.from('blog_categories')         |
    |  .select()                                    |
    |---------------------------------------------->|
    |  (NEXT_PUBLIC_SUPABASE_ANON_KEY 사용)        |
    |                                               |
    |<----------------------------------------------|
    |  [{ id, name_ko }, ...]                      |
```

## 🚀 배포 체크리스트

### 1. Supabase 설정
- [ ] `blog_categories` 테이블 생성
- [ ] `blog_posts` 테이블 생성
- [ ] RLS 정책 설정
  - [ ] 카테고리 읽기 허용 (모두)
  - [ ] 포스트 읽기 허용 (published=true만)
- [ ] Service Role Key 복사

### 2. 환경 변수 설정
- [ ] Vercel Dashboard에 환경 변수 추가
- [ ] 모든 Environment (Production, Preview, Development) 선택
- [ ] 배포 후 테스트

### 3. 기능 테스트
- [ ] 카테고리 목록 로드 확인
- [ ] 블로그 발행 테스트
- [ ] Supabase 테이블에 데이터 확인
- [ ] 에러 처리 확인

## 🛠️ 트러블슈팅

### "SUPABASE_URL is not defined" 에러
```bash
# 환경 변수가 설정되지 않음
→ .env.local 파일 확인
→ Vercel 환경 변수 확인
→ 개발 서버 재시작
```

### 카테고리가 로드되지 않음
```bash
# RLS 정책 확인
→ Supabase Dashboard → Authentication → Policies
→ blog_categories 테이블에 SELECT 정책 있는지 확인
```

### 블로그 발행 실패
```bash
# Service Role Key 확인
→ Vercel 환경 변수 SUPABASE_SERVICE_ROLE_KEY 확인
→ Supabase Settings → API → service_role key 확인
→ 브라우저 Console 및 Vercel Logs 확인
```

## 📝 Next.js API Route vs Edge Function

### 현재 구조 (Next.js API Route)
```typescript
// app/api/publish-blog/route.ts
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // ...
}
```

**장점:**
- ✅ Next.js 프로젝트 내에서 완결
- ✅ 환경 변수 Vercel에서 관리
- ✅ 타입스크립트 통합 용이
- ✅ 배포 설정 간단

### Alternative: Supabase Edge Function
```typescript
// supabase/functions/publish-blog/index.ts
Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  // ...
});
```

**장점:**
- ✅ Supabase 시크릿 관리 활용
- ✅ Edge 네트워크 글로벌 배포
- ✅ Supabase 프로젝트와 긴밀한 통합

**선택 기준:**
- Next.js 중심 프로젝트 → Next.js API Route (현재 구조)
- Supabase 중심 프로젝트 → Supabase Edge Function

## 🔗 관련 문서

- [Vercel 환경 변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
