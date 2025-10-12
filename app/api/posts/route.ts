import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: '포스트를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
