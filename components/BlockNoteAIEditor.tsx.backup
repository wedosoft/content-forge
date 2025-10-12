'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useState, useEffect } from "react";

interface BlockNoteAIEditorProps {
  onContentChange?: (content: any) => void;
  editorRef?: React.MutableRefObject<any>;
}

export default function BlockNoteAIEditor({ onContentChange, editorRef }: BlockNoteAIEditorProps) {
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [originalContent, setOriginalContent] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // BlockNote 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "🤖 BlockNote AI 협업 에디터"
      },
      {
        type: "paragraph",
        content: "텍스트를 선택하고 AI 버튼을 클릭해서 리라이팅해보세요!"
      },
      {
        type: "heading",
        props: { level: 2 },
        content: "AI 기술의 발전"
      },
      {
        type: "paragraph",
        content: "인공지능(AI) 기술은 최근 몇 년 동안 놀라운 발전을 이루어왔습니다. 특히 자연어 처리와 기계학습 분야에서의 혁신은 우리의 일상생활과 업무 방식을 크게 변화시키고 있습니다."
      },
      {
        type: "paragraph",
        content: "This technology will continue to evolve and transform how we work, learn, and communicate in the digital age."
      },
      {
        type: "paragraph",
        content: "ChatGPT와 같은 대화형 AI의 등장으로 일반 사용자도 쉽게 AI 기술을 활용할 수 있게 되었습니다."
      }
    ]
  });

  // 에디터 참조 설정
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // AI 리라이팅 처리
  const handleAIRewrite = async () => {
    const selection = editor.getSelection();
    if (!selection) {
      alert('텍스트를 먼저 선택해주세요!');
      return;
    }

    const selectedBlocks = selection.blocks;
    if (selectedBlocks.length === 0) {
      alert('텍스트를 먼저 선택해주세요!');
      return;
    }

    // 원본 콘텐츠 저장
    setOriginalContent(editor.document);

    const selectedText = selectedBlocks
      .map((block: any) => block.content?.map((c: any) => c.text || '').join('') || '')
      .join('\n');

    const prompt = window.prompt('AI에게 어떻게 수정할지 알려주세요:', '더 전문적으로 리라이팅해줘');

    if (!prompt) return;

    setIsAIProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `다음 텍스트를 "${prompt}" 방식으로 수정해줘. 수정된 텍스트만 반환하고 다른 설명은 하지 마:\n\n${selectedText}`
            }
          ]
        })
      });

      if (!response.ok) throw new Error('AI 요청 실패');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const text = line.substring(2).trim();
                if (text) {
                  const parsed = JSON.parse(text);
                  if (parsed) aiResponse += parsed;
                }
              } catch (e) {}
            }
          }
        }
      }

      // AI 응답으로 선택된 블록 업데이트
      if (aiResponse && selectedBlocks.length > 0) {
        const firstBlock = selectedBlocks[0];
        editor.updateBlock(firstBlock.id, {
          type: "paragraph",
          content: aiResponse.trim()
        });

        // 나머지 선택된 블록 제거
        for (let i = 1; i < selectedBlocks.length; i++) {
          editor.removeBlocks([selectedBlocks[i].id]);
        }

        // 컨펌 다이얼로그 표시
        setShowConfirmDialog(true);
      }

    } catch (error) {
      console.error('AI 리라이팅 에러:', error);
      alert('AI 리라이팅 중 오류가 발생했습니다.');
    } finally {
      setIsAIProcessing(false);
    }
  };

  // 원본으로 복원
  const handleRevert = () => {
    if (originalContent) {
      editor.replaceBlocks(editor.document, originalContent);
      setShowConfirmDialog(false);
      setOriginalContent(null);
    }
  };

  // 변경 사항 수락
  const handleAccept = () => {
    setShowConfirmDialog(false);
    setOriginalContent(null);
  };

  // 콘텐츠 변경 시 부모 컴포넌트에 알림
  const handleChange = () => {
    if (onContentChange) {
      const blocks = editor.document;
      onContentChange(blocks);
    }
  };

  return (
    <div className="h-full relative">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
      />

      {/* AI 버튼 - 텍스트 선택 시 표시 */}
      <button
        onClick={handleAIRewrite}
        disabled={isAIProcessing}
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10"
        title="AI 리라이팅"
      >
        🤖 {isAIProcessing ? '처리 중...' : 'AI 리라이팅'}
      </button>

      {/* 컨펌 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-bold mb-4">AI 수정 완료</h3>
            <p className="mb-6">AI가 텍스트를 수정했습니다. 변경사항을 유지하시겠습니까?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRevert}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                원본으로 복원
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                변경사항 유지
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
