'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ChatInterface from '../components/ChatInterface';
import { supabaseBlog, BlogCategory } from '../lib/supabase';
import { Loader2, Send, Search, Edit2, Trash2, LogOut, Link2 } from 'lucide-react';

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
  const router = useRouter();
  const createEditorRef = useRef<any>(null);
  const manageEditorRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // 인증 상태 확인
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('세션 확인에 실패했습니다.');
        }

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (data.authenticated) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          router.replace('/login');
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

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

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      router.push('/login');
    }
  };

  // 인증 확인 중에는 로딩 표시
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sanitizeHtmlForDarkMode = (
    html: string,
    options?: {
      baseUrl?: string;
    }
  ) => {
    if (typeof window === 'undefined') {
      return html;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
      const wrapper = doc.body.firstElementChild as HTMLElement | null;
      const root = (wrapper ?? doc.body) as HTMLElement;

      const allowedIframeHosts = new Set([
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'player.vimeo.com',
        'embed.ted.com',
        'www.instagram.com',
      ]);

      const toAbsoluteUrl = (value?: string | null) => {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^javascript:/i.test(trimmed)) {
          return '';
        }
        if (/^(data:|mailto:|tel:)/i.test(trimmed)) {
          return trimmed;
        }

        const base = options?.baseUrl || window.location.origin;

        try {
          return new URL(trimmed, base).toString();
        } catch (error) {
          return trimmed;
        }
      };

      const convertSrcset = (value?: string | null) => {
        if (!value) return '';

        const sources = value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((entry) => {
            const [url, descriptor] = entry.split(/\s+/, 2);
            const absolute = toAbsoluteUrl(url);
            if (!absolute) {
              return '';
            }
            return descriptor ? `${absolute} ${descriptor}` : absolute;
          })
          .filter(Boolean);

        return sources.join(', ');
      };

      const stripBackground = (element: HTMLElement) => {
        if (element.hasAttribute('bgcolor')) {
          element.removeAttribute('bgcolor');
        }
        if (element.hasAttribute('background')) {
          element.removeAttribute('background');
        }

        const styleAttr = element.getAttribute('style');
        if (!styleAttr) {
          return;
        }

        const filteredRules = styleAttr
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .filter((rule) => {
            const [property] = rule.split(':');
            if (!property) return false;
            return !property.trim().toLowerCase().startsWith('background');
          });

        if (filteredRules.length > 0) {
          element.setAttribute('style', filteredRules.join('; '));
        } else {
          element.removeAttribute('style');
        }
      };

      const processElement = (element: HTMLElement) => {
        stripBackground(element);

        Array.from(element.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const value = attr.value;

          if (name.startsWith('on')) {
            element.removeAttribute(attr.name);
            return;
          }

          if (name === 'style') {
            return;
          }

          if (name === 'href' || name === 'poster') {
            const absolute = toAbsoluteUrl(value);
            if (absolute) {
              element.setAttribute(attr.name, absolute);
            } else {
              element.removeAttribute(attr.name);
            }
            return;
          }

          if (name === 'src') {
            const absolute = toAbsoluteUrl(value);
            if (absolute) {
              element.setAttribute('src', absolute);
            } else {
              element.removeAttribute('src');
            }
            return;
          }

          if (name === 'data-src') {
            const absolute = toAbsoluteUrl(value);
            if (absolute) {
              element.setAttribute('src', absolute);
            }
            element.removeAttribute(attr.name);
            return;
          }

          if (name === 'srcset') {
            const absoluteSet = convertSrcset(value);
            if (absoluteSet) {
              element.setAttribute('srcset', absoluteSet);
            } else {
              element.removeAttribute('srcset');
            }
            return;
          }

          if (name === 'data-srcset') {
            const absoluteSet = convertSrcset(value);
            if (absoluteSet) {
              element.setAttribute('srcset', absoluteSet);
            }
            element.removeAttribute(attr.name);
          }
        });

        if (element.tagName.toLowerCase() === 'iframe') {
          const src = element.getAttribute('src');
          if (!src) {
            element.remove();
            return;
          }

          try {
            const iframeUrl = new URL(src);
            if (!allowedIframeHosts.has(iframeUrl.hostname)) {
              const anchor = doc.createElement('a');
              anchor.href = src;
              anchor.textContent = src;
              anchor.target = '_blank';
              anchor.rel = 'noopener noreferrer';
              element.replaceWith(anchor);
              return;
            }
            element.setAttribute('allowfullscreen', 'true');
          } catch (error) {
            element.remove();
          }
        }

        if (element.tagName.toLowerCase() === 'a') {
          const href = element.getAttribute('href');
          if (href) {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
        }
      };

      processElement(root);
      root.querySelectorAll<HTMLElement>('*').forEach(processElement);

      return wrapper ? wrapper.innerHTML : doc.body.innerHTML;
    } catch (error) {
      console.error('Failed to sanitize HTML background styles:', error);
      return html;
    }
  };

  const handleImportFromUrl = async () => {
    const trimmedUrl = importUrl.trim();

    if (!trimmedUrl) {
      setImportError('가져올 URL을 입력하세요.');
      return;
    }

    if (!createEditorRef.current) {
      setImportError('에디터가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const response = await fetch('/api/fetch-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '페이지를 불러오지 못했습니다.');
      }

      const cleanedHtml = sanitizeHtmlForDarkMode(data.html, {
        baseUrl: data.baseUrl,
      });

      const blocks = createEditorRef.current.tryParseHTMLToBlocks(cleanedHtml);
      createEditorRef.current.replaceBlocks(createEditorRef.current.document, blocks);

      if (data.title && !postTitle) {
        setPostTitle(data.title);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError(
        error instanceof Error ? error.message : '페이지를 불러오지 못했습니다.'
      );
    } finally {
      setIsImporting(false);
    }
  };

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

    if (!createEditorRef.current) {
      alert('에디터가 준비되지 않았습니다');
      return;
    }

    setIsPublishing(true);

    try {
      const blocks = createEditorRef.current.document;
      const rawHtml = createEditorRef.current.blocksToHTMLLossy(blocks);
      const htmlContent = sanitizeHtmlForDarkMode(rawHtml);

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
      if (createEditorRef.current?.replaceBlocks) {
        createEditorRef.current.replaceBlocks(createEditorRef.current.document, [
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
        if (manageEditorRef.current && data.post.content_html) {
          console.log('Loading content to editor:', data.post.content_html.substring(0, 100));
          try {
            const cleanedHtml = sanitizeHtmlForDarkMode(data.post.content_html);
            const blocks = manageEditorRef.current.tryParseHTMLToBlocks(cleanedHtml);
            console.log('Parsed blocks:', blocks);
            manageEditorRef.current.replaceBlocks(manageEditorRef.current.document, blocks);
            console.log('Content loaded successfully');
          } catch (err) {
            console.error('Error loading content to editor:', err);
          }
        } else {
          console.error('Editor ref not available or no content:', {
            hasRef: !!manageEditorRef.current,
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

    if (!manageEditorRef.current) {
      alert('에디터가 준비되지 않았습니다');
      return;
    }

    setIsUpdating(true);

    try {
      const blocks = manageEditorRef.current.document;
      const rawHtml = manageEditorRef.current.blocksToHTMLLossy(blocks);
      const htmlContent = sanitizeHtmlForDarkMode(rawHtml);

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
      if (manageEditorRef.current?.replaceBlocks) {
        manageEditorRef.current.replaceBlocks(manageEditorRef.current.document, [
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
    if (manageEditorRef.current?.replaceBlocks) {
      manageEditorRef.current.replaceBlocks(manageEditorRef.current.document, [
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
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:inline">
                {currentUser?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          )}
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
              if (createEditorRef.current?.replaceBlocks) {
                createEditorRef.current.replaceBlocks(createEditorRef.current.document, [
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
            <div className="container max-w-7xl mt-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> 원본 URL
                  </label>
                  <div className="flex flex-1 gap-2">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(event) => {
                        setImportUrl(event.target.value);
                        if (importError) {
                          setImportError('');
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          if (!isImporting) {
                            handleImportFromUrl();
                          }
                        }
                      }}
                      placeholder="https://example.com/article"
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleImportFromUrl}
                      disabled={isImporting}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap font-medium"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          불러오는 중
                        </>
                      ) : (
                        <>불러오기</>
                      )}
                    </button>
                  </div>
                </div>
                {importError ? (
                  <p className="text-sm text-destructive">{importError}</p>
                ) : (
                  importUrl && (
                    <p className="text-xs text-muted-foreground">
                      URL을 입력하면 이미지·비디오를 포함해 원본 페이지와 유사한 형태로 에디터에 로드됩니다.
                    </p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex-1 flex overflow-hidden bg-muted/30">
            <div className="container max-w-7xl w-full flex py-4 gap-4">
              {/* 채팅 영역 (왼쪽) */}
              <div className="w-80 flex-shrink-0">
                <ChatInterface editorRef={createEditorRef} />
              </div>

              {/* 에디터 영역 (오른쪽) */}
              <div className="flex-1 overflow-auto">
                <div className="h-full">
                  <div className="bg-card rounded-lg shadow-sm border h-full p-4">
                    <BlockNoteEditorWithAI editorRef={createEditorRef} />
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
                      <BlockNoteEditorWithAI editorRef={manageEditorRef} />
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
