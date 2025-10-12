'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import ChatInterface from '../components/ChatInterface';

// BlockNote AI 에디터를 동적으로 로드 (SSR 방지)
const BlockNoteEditorWithAI = dynamic(
  () => import('../components/BlockNoteEditorWithAI_v2'),
  { ssr: false }
);

export default function Home() {
  const editorRef = useRef<any>(null);

  return (
    <main className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              BlockNote AI 리라이터
            </h1>
            <p className="text-gray-600 mt-1">
              에디터에서 텍스트를 작성하고 AI와 채팅하여 리라이팅하세요
            </p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/ai-collab"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2"
            >
              🤖 AI 협업 모드
            </a>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 에디터 영역 */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto h-full">
            <div className="bg-white rounded-lg shadow-sm border h-full p-4">
              <BlockNoteEditorWithAI 
                editorRef={editorRef}
              />
            </div>
          </div>
        </div>

        {/* 채팅 영역 */}
        <div className="w-80 flex-shrink-0">
          <ChatInterface editorRef={editorRef} />
        </div>
      </div>
    </main>
  );
}