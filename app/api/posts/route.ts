import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API route를 dynamic으로 설정
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('API /api/posts called');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    console.log('Search params:', { search, limit });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created');

    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, full_path, wp_published_at, category_id')
      .eq('published', true);

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
    } else {
      query = query.limit(limit);
    }

    query = query.order('wp_published_at', { ascending: false });

    console.log('Executing query...');
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log('Query successful, posts count:', data?.length || 0);
    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    console.error('Get posts error details:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      { error: '포스트를 불러올 수 없습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
