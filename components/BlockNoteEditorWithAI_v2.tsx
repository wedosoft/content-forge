'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect } from "react";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
} from "@blocknote/react";

interface BlockNoteEditorWithAIProps {
  onContentChange?: (content: any) => void;
  editorRef?: React.MutableRefObject<any>;
}

export default function BlockNoteEditorWithAI({ onContentChange, editorRef }: BlockNoteEditorWithAIProps) {
  // AI 처리를 위한 커스텀 함수
  const handleAIRequest = async (prompt: string, selectedText: string) => {
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textBlocks: [
            {
              id: 'selected_block',
              text: selectedText,
              type: 'paragraph'
            }
          ],
          action: 'custom',
          customInstruction: prompt
        }),
      });

      const data = await response.json();
      return data.processedBlocks?.[0]?.text || '처리 중 오류가 발생했습니다.';
    } catch (error) {
      console.error('AI 요청 오류:', error);
      return '처리 중 오류가 발생했습니다.';
    }
  };

  // BlockNote 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "AI 협업 에디터"
      },
      {
        type: "paragraph",
        content: "텍스트를 선택하고 툴바의 AI 버튼을 눌러보세요. 또는 / 를 입력해서 AI 명령을 사용할 수 있습니다."
      },
      {
        type: "paragraph",
        content: "인공지능(AI) 기술은 최근 몇 년 동안 놀라운 발전을 이루어왔습니다. 특히 자연어 처리와 기계학습 분야에서의 혁신은 우리의 일상생활과 업무 방식을 크게 변화시키고 있습니다."
      },
      {
        type: "paragraph",
        content: "This technology will continue to evolve and transform how we work, learn, and communicate in the digital age."
      }
    ]
  });

  // 에디터 참조 설정
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // 콘텐츠 변경 시 부모 컴포넌트에 알림
  const handleChange = () => {
    if (onContentChange) {
      const blocks = editor.document;
      onContentChange(blocks);
    }
  };

  return (
    <div className="h-full">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
      >
        {/* 포맷팅 툴바에 AI 버튼 추가 */}
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {...getFormattingToolbarItems()}
              {/* 커스텀 AI 버튼 */}
              <CustomAIButton editor={editor} onAIRequest={handleAIRequest} />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>
    </div>
  );
}

// 커스텀 AI 버튼 컴포넌트
function CustomAIButton({ editor, onAIRequest }: { editor: any, onAIRequest: (prompt: string, text: string) => Promise<string> }) {
  const handleAIClick = async () => {
    const selectedText = editor.getSelectedText();
    const currentBlock = editor.getTextCursorPosition().block;
    const textToProcess = selectedText || currentBlock.content?.[0]?.text || '';
    
    if (!textToProcess) {
      alert('처리할 텍스트를 선택하거나 블록에 텍스트를 입력해주세요.');
      return;
    }

    // 사용자에게 AI 명령 입력 받기
    const userPrompt = prompt('AI에게 어떤 작업을 요청하시겠습니까?\n\n예시: "한국어로 번역해줘", "더 정중한 어조로 바꿔줘", "요약해줘"');
    
    if (userPrompt) {
      try {
        // 로딩 표시
        const loadingText = '🔄 AI 처리 중...';
        editor.updateBlock(currentBlock, {
          content: [{ type: 'text', text: loadingText }]
        });

        // AI 처리 요청
        const processedText = await onAIRequest(userPrompt, textToProcess);
        
        // 결과 반영
        editor.updateBlock(currentBlock, {
          content: [{ type: 'text', text: processedText }]
        });
      } catch (error) {
        console.error('AI 처리 오류:', error);
        editor.updateBlock(currentBlock, {
          content: [{ type: 'text', text: textToProcess }] // 원본 복원
        });
        alert('AI 처리 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <button
      className="bn-button"
      onClick={handleAIClick}
      title="AI로 텍스트 처리"
    >
      🤖 AI
    </button>
  );
}