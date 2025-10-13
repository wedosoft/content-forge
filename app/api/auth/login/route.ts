import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  SESSION_TOKEN,
  validateCredentials,
} from '@/lib/simple-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const passwordIsString = typeof password === 'string';
    const trimmedPassword = passwordIsString ? password.trim() : '';

    console.log('[auth/login] attempt', {
      email,
      hasPassword: passwordIsString && password.length > 0,
      rawPasswordLength: passwordIsString ? password.length : undefined,
      trimmedPasswordLength: trimmedPassword.length,
    });

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const credentialsValid = validateCredentials(email, password);

    console.log('[auth/login] credentialsValid', credentialsValid);

    if (!credentialsValid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: '로그인되었습니다.',
      user: getAuthenticatedUser(),
    });

    const isHttps = request.nextUrl.protocol === 'https:';

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: SESSION_TOKEN,
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
