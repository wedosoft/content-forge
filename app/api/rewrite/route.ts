import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { textBlocks, action, customInstruction } = await request.json();

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'translate':
        systemPrompt = `당신은 전문 번역가입니다. 주어진 텍스트 블록들을 자연스러운 한국어로 번역해주세요.
        각 블록의 ID와 구조를 유지하면서 텍스트만 번역하세요.`;
        break;
      case 'grammar':
        systemPrompt = `당신는 교정 전문가입니다. 주어진 텍스트의 맞춤법, 문법, 띄어쓰기를 교정해주세요.
        내용은 변경하지 말고 오류만 수정하세요.`;
        break;
      case 'expand':
        systemPrompt = `당신은 콘텐츠 작성 전문가입니다. 주어진 텍스트를 더 상세하고 풍부하게 확장해주세요.
        핵심 내용은 유지하면서 예시, 설명, 세부사항을 추가하여 블로그 포스팅에 적합하게 만드세요.`;
        break;
      case 'simplify':
        systemPrompt = `당신은 쉬운 글쓰기 전문가입니다. 주어진 텍스트를 누구나 이해하기 쉽게 단순화해주세요.
        어려운 용어는 쉬운 말로 바꾸고, 복잡한 문장은 간단하게 풀어서 작성하세요.`;
        break;
      case 'professional':
        systemPrompt = `당신은 비즈니스 글쓰기 전문가입니다. 주어진 텍스트를 전문적이고 비즈니스에 적합한 어조로 변환해주세요.
        격식있고 신뢰감 있는 표현을 사용하되 과도하게 딱딱하지 않게 작성하세요.`;
        break;
      case 'seo':
        systemPrompt = `당신은 SEO 전문가입니다. 주어진 텍스트를 검색엔진 최적화에 적합하게 개선해주세요.
        자연스러운 키워드 배치, 명확한 문장 구조, 정보성 있는 표현을 사용하여 검색 노출에 유리하게 작성하세요.`;
        break;
      case 'custom':
        systemPrompt = `당신은 텍스트 편집 전문가입니다. 사용자의 요청에 따라 텍스트를 수정해주세요: ${customInstruction}`;
        break;
      default:
        systemPrompt = '주어진 텍스트를 개선해주세요.';
    }

    userPrompt = `다음 텍스트 블록들을 처리해주세요:

${JSON.stringify(textBlocks, null, 2)}

응답은 반드시 다음 JSON 형식으로만 제공해주세요:
{
  "processedBlocks": [
    {
      "id": "원본_블록_ID", 
      "text": "처리된_텍스트", 
      "type": "원본_블록_타입"
    }
  ]
}

- 각 블록의 id와 type은 원본과 동일하게 유지하세요
- text 내용만 요청에 따라 처리하세요
- JSON 형식 외의 다른 설명은 포함하지 마세요`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;
    
    if (!responseText) {
      throw new Error('OpenAI 응답이 비어있습니다.');
    }

    // JSON 응답 파싱
    let parsedResponse;
    try {
      // 코드 블록이나 다른 텍스트가 포함된 경우를 대비해 JSON 부분만 추출
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