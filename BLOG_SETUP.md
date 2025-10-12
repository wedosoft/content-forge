# 블로그 발행 기능 설정 가이드

이 문서는 Content Forge에 추가된 블로그 발행 기능 설정 방법을 안내합니다.

## 📋 개요

Content Forge의 메인 에디터에서 작성한 콘텐츠를 Supabase 데이터베이스에 직접 발행할 수 있습니다.

## 🔧 필수 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. 새 프로젝트 생성
3. 프로젝트 URL과 anon key 복사

### 2. 환경 변수 설정

`.env.local` 파일에 Supabase 정보 추가:

```env
# Supabase 블로그 데이터베이스 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 데이터베이스 스키마 설정

Supabase SQL Editor에서 다음 쿼리를 실행하세요:

#### Step 1: 카테고리 테이블 생성

```sql
-- 블로그 카테고리 테이블
CREATE TABLE blog_categories (
  id SERIAL PRIMARY KEY,
  name_ko TEXT NOT NULL UNIQUE,
  name_en TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 카테고리 데이터 삽입
INSERT INTO blog_categories (name_ko, name_en, slug) VALUES
  ('기술', 'Tech', 'tech'),
  ('디자인', 'Design', 'design'),
  ('비즈니스', 'Business', 'business'),
  ('일상', 'Life', 'life'),
  ('뉴스', 'News', 'news');
```

#### Step 2: 블로그 포스트 테이블 생성

```sql
-- 블로그 포스트 테이블
CREATE TABLE blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  wp_published_at TIMESTAMP WITH TIME ZONE,
  full_path TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(wp_published_at DESC);
```

#### Step 3: 자동 업데이트 트리거 설정

```sql
-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Step 4: Row Level Security (RLS) 설정 (선택사항)

```sql
-- RLS 활성화
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 카테고리 읽기 가능
CREATE POLICY "Anyone can read categories"
  ON blog_categories FOR SELECT
  TO public
  USING (true);

-- 발행된 포스트만 읽기 가능
CREATE POLICY "Anyone can read published posts"
  ON blog_posts FOR SELECT
  TO public
  USING (published = true);

-- 인증된 사용자만 포스트 생성/수정 가능 (선택사항)
-- 필요시 주석 해제하여 사용
-- CREATE POLICY "Authenticated users can insert posts"
--   ON blog_posts FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can update posts"
--   ON blog_posts FOR UPDATE
--   TO authenticated
--   USING (true);
```

## 🎯 사용 방법

### 1. 개발 서버 재시작

환경 변수를 추가한 후 개발 서버를 재시작하세요:

```bash
npm run dev
```

### 2. 블로그 포스트 작성

1. 메인 페이지 상단의 입력 필드에 **포스트 제목** 입력
2. **카테고리** 드롭다운에서 분류 선택
3. BlockNote 에디터에서 **콘텐츠 작성**
4. **블로그 발행** 버튼 클릭

### 3. 발행 확인

Supabase Dashboard → Table Editor → `blog_posts` 테이블에서 확인

## 📊 데이터베이스 스키마 설명

### `blog_categories` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | 기본 키 |
| name_ko | TEXT | 한국어 카테고리명 (필수) |
| name_en | TEXT | 영어 카테고리명 |
| slug | TEXT | URL용 슬러그 |
| description | TEXT | 카테고리 설명 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

### `blog_posts` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | 기본 키 |
| title | TEXT | 포스트 제목 (필수) |
| slug | TEXT | URL용 슬러그 (자동 생성) |
| content | TEXT | HTML 콘텐츠 (필수) |
| excerpt | TEXT | 요약문 |
| category_id | INTEGER | 카테고리 FK |
| published | BOOLEAN | 발행 상태 |
| featured | BOOLEAN | 추천 포스트 여부 |
| view_count | INTEGER | 조회수 |
| wp_published_at | TIMESTAMP | 발행 시간 |
| full_path | TEXT | 전체 경로 (/blog/slug) |
| meta_title | TEXT | SEO 제목 |
| meta_description | TEXT | SEO 설명 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 🔍 트러블슈팅

### 카테고리가 로드되지 않는 경우

1. Supabase 프로젝트 URL과 anon key 확인
2. 브라우저 콘솔에서 네트워크 에러 확인
3. Supabase RLS 정책 확인 (읽기 권한 필요)

### 발행 실패 시

1. 제목과 카테고리가 모두 입력되었는지 확인
2. 에디터에 콘텐츠가 작성되었는지 확인
3. 브라우저 콘솔 에러 메시지 확인
4. Supabase 테이블 구조가 올바른지 확인

### 환경 변수가 적용되지 않는 경우

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 개발 서버를 재시작했는지 확인
3. `NEXT_PUBLIC_` 접두사가 있는지 확인

## 🚀 고급 기능 (향후 추가 예정)

- [ ] 포스트 수정 기능
- [ ] 포스트 삭제 기능
- [ ] 포스트 목록 보기
- [ ] 미리보기 기능
- [ ] 이미지 업로드
- [ ] SEO 메타데이터 입력
- [ ] 예약 발행

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 환경 변수](https://nextjs.org/docs/basic-features/environment-variables)
- [BlockNote 에디터](https://www.blocknotejs.org/)

## ❓ 문의

문제가 발생하거나 추가 기능이 필요한 경우 GitHub Issues에 등록해주세요.
