import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/118.0 Safari/537.36';

const MAX_HTML_BYTES = 2_000_000; // 2MB

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '유효한 URL을 입력하세요.' },
        { status: 400 }
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'URL 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `원본 페이지를 불러오지 못했습니다. (${response.status})` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'HTML 페이지만 가져올 수 있습니다.' },
        { status: 400 }
      );
    }

    const rawHtml = await response.text();

    if (rawHtml.length > MAX_HTML_BYTES) {
      return NextResponse.json(
        { error: '페이지가 너무 큽니다. 다른 페이지를 선택해주세요.' },
        { status: 400 }
      );
    }

    const sanitizedHtml = stripUnsafeMarkup(rawHtml);
    const bodyHtml = extractBody(sanitizedHtml) || sanitizedHtml;
    const title = extractTitle(rawHtml);

    return NextResponse.json({
      html: bodyHtml,
      baseUrl: targetUrl.origin,
      sourceUrl: targetUrl.toString(),
      title,
    });
  } catch (error) {
    console.error('fetch-article error:', error);
    return NextResponse.json(
      { error: '페이지 내용을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function stripUnsafeMarkup(html: string): string {
  let cleaned = html;

  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  cleaned = cleaned.replace(/<!--([\s\S]*?)-->/g, '');
  cleaned = cleaned.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/on[a-z]+\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(/on[a-z]+\s*=\s*[^\s>]+/gi, '');
  cleaned = cleaned.replace(/<iframe[^>]+javascript:[^>]*>[\s\S]*?<\/iframe>/gi, '');

  return cleaned;
}

function extractBody(html: string): string | null {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : null;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return '';
  }

  const text = match[1]
    .replace(/\s+/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();

  return text;
}
