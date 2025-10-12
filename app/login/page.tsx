'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { supabaseAuth } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 경우 홈으로 리다이렉트
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      if (isLogin) {
        // 로그인 성공 - 홈으로 리다이렉트
        router.push('/');
      } else {
        // 회원가입 성공
        alert(data.message);
        setIsLogin(true); // 로그인 탭으로 전환
        setPassword(''); // 비밀번호 초기화
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <header className="w-full border-b bg-background">
        <div className="container max-w-7xl flex h-16 items-center">
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

      {/* 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8">
            {/* 헤더 */}
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {isLogin ? '로그인' : '회원가입'}
            </h2>

            {/* 탭 전환 */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  isLogin
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  !isLogin
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                회원가입
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            {/* 회원가입 안내 */}
            {!isLogin && (
              <div className="mb-4 p-3 bg-primary/10 text-primary rounded-md text-sm">
                @wedosoft.net 도메인의 이메일만 가입 가능합니다.
              </div>
            )}

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={!isLogin ? 'example@wedosoft.net' : '이메일을 입력하세요'}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={!isLogin ? '최소 6자 이상' : '비밀번호를 입력하세요'}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>{isLogin ? '로그인' : '회원가입'}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
