import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured on the server.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const { textBlocks, action, customInstruction } = await request.json();

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'translate':
        systemPrompt = `당신은 전문 번역가입니다. 주어진 텍스트 블록들을 자연스러운 한국어로 번역해주세요.`;
        break;
      case 'grammar':
        systemPrompt = `당신은 교정 전문가입니다. 주어진 텍스트의 맞춤법, 문법, 띄어쓰기를 교정해주세요.`;
        break;
      case 'expand':
        systemPrompt = `당신은 콘텐츠 작성 전문가입니다. 주어진 텍스트를 더 상세하고 풍부하게 확장해주세요.`;
        break;
      case 'simplify':
        systemPrompt = `당신은 쉬운 글쓰기 전문가입니다. 주어진 텍스트를 누구나 이해하기 쉽게 단순화해주세요.`;
        break;
      case 'professional':
        systemPrompt = `당신은 비즈니스 글쓰기 전문가입니다. 주어진 텍스트를 전문적이고 비즈니스에 적합한 어조로 변환해주세요.`;
        break;
      case 'seo':
        systemPrompt = `당신은 SEO 전문가입니다. 주어진 텍스트를 검색엔진 최적화에 적합하게 개선해주세요.`;
        break;
      case 'custom':
        systemPrompt = `당신은 텍스트 편집 전문가입니다. 사용자의 요청에 따라 텍스트를 수정해주세요: ${customInstruction}`;
        break;
      default:
        systemPrompt = '주어진 텍스트를 개선해주세요.';
    }

    userPrompt = `다음 텍스트 블록의 각 segment를 요청에 맞게 처리해주세요. segment 순서와 개수를 유지하고 text만 변경하세요:

${JSON.stringify(textBlocks, null, 2)}

응답은 반드시 다음 JSON 형식으로만 제공해주세요:
{
  "processedBlocks": [
    {
      "id": "원본_블록_ID",
      "segments": [
        {
          "index": 0,
          "text": "처리된_텍스트"
        }
      ]
    }
  ]
}

중요한 규칙:
- id는 원본과 정확히 동일하게 유지하세요
- segment 배열의 길이와 각 segment.index는 원본과 동일해야 합니다
- 각 segment.text만 요청에 따라 처리하세요
- JSON 형식 외의 다른 설명은 포함하지 마세요`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 16000,
    });

    const responseText = completion.choices[0].message.content;

    if (!responseText) {
      throw new Error('OpenAI 응답이 비어있습니다.');
    }

    // JSON 응답 파싱
    let parsedResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('AI 응답 형식이 올바르지 않습니다.');
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('리라이팅 오류:', error);
    return NextResponse.json(
      { error: '텍스트 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
