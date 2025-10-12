'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import ChatInterface from '../components/ChatInterface';
import { supabaseBlog, BlogCategory } from '../lib/supabase';
import { Loader2, Send, Search, Edit2, Trash2 } from 'lucide-react';

// BlockNote AI 에디터를 동적으로 로드 (SSR 방지)
const BlockNoteEditorWithAI = dynamic(
  () => import('../components/BlockNoteEditorWithAI'),
  { ssr: false }
);

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  full_path: string;
  wp_published_at: string;
  category_id: string;
}

export default function Home() {
  const editorRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // 포스팅 상태
  const [postTitle, setPostTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // 관리 탭 상태
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 카테고리 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabaseBlog
          .from('blog_categories')
          .select('id, name_ko')
          .order('name_ko');

        if (error) throw error;

        const categories = (data || []).map((row) => ({
          id: row.id,
          name_ko: row.name_ko,
        }));
        setCategories(categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // 포스트 목록 가져오기
  const fetchPosts = async (search?: string) => {
    setIsLoadingPosts(true);
    try {
      const queryParams = new URLSearchParams();
      if (search?.trim()) {
        queryParams.append('search', search);
      }

      const response = await fetch(`/api/posts?${queryParams.toString()}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      alert('포스트를 불러올 수 없습니다.');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // 포스트 검색
  useEffect(() => {
    if (activeTab === 'manage') {
      const timer = setTimeout(() => {
        fetchPosts(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);

  // 포스트 발행
  const handlePublishToBlog = async () => {
    if (!postTitle.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    if (!selectedCategory) {
      alert('카테고리를 선택하세요');
      return;
    }

    if (!editorRef.current) {
      alert('에디터가 준비되지 않았습니다');
      return;
    }

    setIsPublishing(true);

    try {
      const blocks = editorRef.current.document;
      const htmlContent = editorRef.current.blocksToHTMLLossy(blocks);

      const response = await fetch('/api/publish-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postTitle,
          content: htmlContent,
          category_id: selectedCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '발행 중 오류가 발생했습니다.');
      }

      alert(data.message || '블로그에 발행되었습니다!');

      // 초기화
      setPostTitle('');
      setSelectedCategory('');
      if (editorRef.current?.replaceBlocks) {
        editorRef.current.replaceBlocks(editorRef.current.document, [
          { type: 'paragraph', content: '' }
        ]);
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert(error instanceof Error ? error.message : '발행 중 오류가 발생했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  // 포스트 수정 로드
  const handleEditPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setEditingPostId(postId);
      setPostTitle(data.post.title);
      setSelectedCategory(data.post.category_id);

      // 에디터가 마운트될 때까지 대기 후 HTML을 에디터에 로드
      setTimeout(() => {
        if (editorRef.current && data.post.content_html) {
          console.log('Loading content to editor:', data.post.content_html.substring(0, 100));
          try {
            const blocks = editorRef.current.tryParseHTMLToBlocks(data.post.content_html);
            console.log('Parsed blocks:', blocks);
            editorRef.current.replaceBlocks(editorRef.current.document, blocks);
            console.log('Content loaded successfully');
          } catch (err) {
            console.error('Error loading content to editor:', err);
          }
        } else {
          console.error('Editor ref not available or no content:', {
            hasRef: !!editorRef.current,
            hasContent: !!data.post.content_html
          });
        }
      }, 100);
    } catch (error) {
      console.error('Edit post error:', error);
      alert('포스트를 불러올 수 없습니다.');
    }
  };

  // 포스트 업데이트
  const handleUpdatePost = async () => {
    if (!editingPostId) return;

    if (!postTitle.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    if (!editorRef.current) {
      alert('에디터가 준비되지 않았습니다');
      return;
    }

    setIsUpdating(true);

    try {
      const blocks = editorRef.current.document;
      const htmlContent = editorRef.current.blocksToHTMLLossy(blocks);

      const response = await fetch(`/api/posts/${editingPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postTitle,
          content: htmlContent,
          category_id: selectedCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '수정 중 오류가 발생했습니다.');
      }

      alert(data.message || '포스트가 업데이트되었습니다!');

      // 초기화
      setEditingPostId(null);
      setPostTitle('');
      setSelectedCategory('');
      if (editorRef.current?.replaceBlocks) {
        editorRef.current.replaceBlocks(editorRef.current.document, [
          { type: 'paragraph', content: '' }
        ]);
      }

      // 포스트 목록 새로고침
      fetchPosts(searchQuery);
    } catch (error) {
      console.error('Update error:', error);
      alert(error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 포스트 삭제
  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말로 이 포스트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '삭제 중 오류가 발생했습니다.');
      }

      alert(data.message || '포스트가 삭제되었습니다!');
      fetchPosts(searchQuery);
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingPostId(null);
    setPostTitle('');
    setSelectedCategory('');
    if (editorRef.current?.replaceBlocks) {
      editorRef.current.replaceBlocks(editorRef.current.document, [
        { type: 'paragraph', content: '' }
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-light.webp"
              alt="WeDoSoft"
              width={140}
              height={40}
              className="h-8 md:h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-dark.webp"
              alt="WeDoSoft"
              width={140}
              height={40}
              className="h-8 md:h-10 w-auto hidden dark:block"
              priority
            />
            <div className="h-6 w-px bg-border" />
            <h1 className="text-base md:text-lg font-medium">
              AI 리라이터
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)]">

      {/* 탭 네비게이션 */}
      <div className="border-b bg-background">
        <div className="container max-w-7xl flex gap-4">
          <button
            onClick={() => {
              setActiveTab('create');
              // 새 포스팅 탭으로 전환 시 초기화
              setEditingPostId(null);
              setPostTitle('');
              setSelectedCategory('');
              if (editorRef.current?.replaceBlocks) {
                editorRef.current.replaceBlocks(editorRef.current.document, [
                  { type: 'paragraph', content: '' }
                ]);
              }
            }}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            새 포스팅
          </button>
          <button
            onClick={() => {
              setActiveTab('manage');
              fetchPosts(searchQuery);
            }}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            포스팅 관리
          </button>
        </div>
      </div>

      {/* 새 포스팅 탭 */}
      {activeTab === 'create' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 블로그 포스팅 컨트롤 */}
          <div className="border-b bg-background py-3">
            <div className="container max-w-7xl flex gap-4 items-center">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">
                  제목
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="블로그 포스트 제목"
                  className="flex-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">
                  카테고리
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-40 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="">선택</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name_ko}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePublishToBlog}
                disabled={isPublishing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap font-medium"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    발행 중
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    발행
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex-1 flex overflow-hidden bg-muted/30">
            <div className="container max-w-7xl w-full flex py-4 gap-4">
              {/* 채팅 영역 (왼쪽) */}
              <div className="w-80 flex-shrink-0">
                <ChatInterface editorRef={editorRef} />
              </div>

              {/* 에디터 영역 (오른쪽) */}
              <div className="flex-1 overflow-auto">
                <div className="h-full">
                  <div className="bg-card rounded-lg shadow-sm border h-full p-4">
                    <BlockNoteEditorWithAI editorRef={editorRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 포스팅 관리 탭 */}
      {activeTab === 'manage' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 포스트 수정 컨트롤 (편집 중일 때만 표시) */}
          {editingPostId && (
            <div className="border-b bg-background py-3">
              <div className="container max-w-7xl flex gap-4 items-center">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    제목
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="블로그 포스트 제목"
                    className="flex-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    카테고리
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-40 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="">선택</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name_ko}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleUpdatePost}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap font-medium"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      저장 중
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      저장
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm whitespace-nowrap font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden bg-muted/30">
            <div className="container max-w-7xl w-full flex py-4 gap-4">
              {/* 포스트 목록 */}
              <div className="w-80 border rounded-lg bg-card flex flex-col shadow-sm">
              {/* 검색 */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="포스트 검색..."
                    className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </div>

              {/* 포스트 리스트 */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingPosts ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    포스트가 없습니다
                  </div>
                ) : (
                  <div className="divide-y">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className={`p-4 hover:bg-white transition-colors ${
                          editingPostId === post.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <h3 className="font-medium text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                          {new Date(post.wp_published_at).toLocaleDateString('ko-KR')}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPost(post.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            <Edit2 className="w-3 h-3" />
                            수정
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            <Trash2 className="w-3 h-3" />
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

              {/* 에디터 영역 */}
              {editingPostId ? (
                <div className="flex-1 p-6 overflow-auto">
                  <div className="max-w-4xl mx-auto h-full">
                    <div className="bg-white rounded-lg shadow-sm border h-full p-4">
                      <BlockNoteEditorWithAI editorRef={editorRef} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <p className="text-lg mb-2">왼쪽에서 포스트를 선택하세요</p>
                    <p className="text-sm">수정 버튼을 클릭하면 에디터가 열립니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
