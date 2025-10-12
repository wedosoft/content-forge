import { createClient } from '@supabase/supabase-js';

// 외부 블로그 데이터베이스 Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseBlog = createClient(supabaseUrl, supabaseAnonKey);

// 타입 정의
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: string;
  published: boolean;
  wp_published_at: string;
  full_path: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogCategory {
  id: string | number;
  name_ko: string;
}
