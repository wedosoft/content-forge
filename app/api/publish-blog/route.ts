import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서만 사용 (환경변수는 Vercel/로컬 환경변수 사용)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { title, content, category_id } = await request.json();

    // 유효성 검사
    if (!title?.trim()) {
      return NextResponse.json(
        { error: '제목을 입력하세요' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: '카테고리를 선택하세요' },
        { status: 400 }
      );
    }

    if (!content || content.trim() === '<p></p>') {
      return NextResponse.json(
        { error: '내용을 작성하세요' },
        { status: 400 }
      );
    }

    // Service Role Key로 Supabase 클라이언트 생성 (RLS 우회)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 현재 최대 wp_post_id 가져오기
    const { data: maxPost } = await supabase
      .from('blog_posts')
      .select('wp_post_id')
      .order('wp_post_id', { ascending: false })
      .limit(1)
      .single();

    // 다음 wp_post_id 생성 (최대값 + 1, 없으면 8211부터 시작)
    const wp_post_id = maxPost?.wp_post_id ? maxPost.wp_post_id + 1 : 8211;

    // 슬러그를 숫자 증가 방식으로 설정
    const slug = String(wp_post_id);

    const postData = {
      title,
      content_html: content,
      slug,
      wp_post_id,
      category_id,
      published: true,
      wp_published_at: new Date().toISOString(),
      full_path: `/blog/${slug}`, // slug를 URL로 사용
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([postData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      post: data,
      message: '블로그에 발행되었습니다!',
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      {
        error: '발행 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
