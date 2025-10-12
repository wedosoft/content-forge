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
      case 'improve-tone':
        systemPrompt = `당신은 글쓰기 전문가입니다. 주어진 텍스트를 더 정중하고 전문적인 어조로 개선해주세요. 
        의미는 그대로 유지하면서 어조만 개선하세요.`;
        break;
      case 'summarize':
        systemPrompt = `당신은 요약 전문가입니다. 주어진 텍스트의 핵심 내용을 간결하게 요약해주세요. 
        중요한 정보는 누락하지 말고 불필요한 부분은 제거하세요.`;
        break;
      case 'grammar':
        systemPrompt = `당신는 교정 전문가입니다. 주어진 텍스트의 맞춤법, 문법, 띄어쓰기를 교정해주세요. 
        내용은 변경하지 말고 오류만 수정하세요.`;
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