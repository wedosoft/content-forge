import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  isValidSession,
  SESSION_COOKIE_NAME,
} from '@/lib/simple-auth';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authenticated = isValidSession(sessionCookie);

    return NextResponse.json({
      authenticated,
      user: authenticated ? getAuthenticatedUser() : null,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
