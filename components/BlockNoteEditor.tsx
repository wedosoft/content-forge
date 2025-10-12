'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect } from "react";

interface BlockNoteEditorProps {
  onContentChange?: (content: any) => void;
  editorRef?: React.MutableRefObject<any>;
}

export default function BlockNoteEditor({ onContentChange, editorRef }: BlockNoteEditorProps) {
  // BlockNote 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "안녕하세요! 여기에 텍스트를 입력하고 오른쪽 채팅에서 리라이팅을 요청해보세요.",
            styles: {}
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "예시: 이 문장을 더 정중한 어조로 바꿔주세요.",
            styles: {}
          }
        ]
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
      />
    </div>
  );
}