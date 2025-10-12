import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 클라이언트 측에서 세션을 관리하므로 여기서는 성공 응답만 반환
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
