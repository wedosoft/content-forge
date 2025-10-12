import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API route를 dynamic으로 설정
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - 특정 포스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: '포스트를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// PUT - 포스트 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, content, category_id } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json(
        { error: '제목을 입력하세요' },
        { status: 400 }
      );
    }

    if (!content || content.trim() === '<p></p>') {
      return NextResponse.json(
        { error: '내용을 작성하세요' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 슬러그 생성
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const updateData = {
      title,
      content_html: content,
      slug,
      category_id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      post: data,
      message: '포스트가 업데이트되었습니다!',
    });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: '포스트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - 포스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '포스트가 삭제되었습니다!',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: '포스트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
