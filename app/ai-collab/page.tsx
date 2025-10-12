'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';

// BlockNote AI 협업 에디터를 동적으로 로드 (SSR 방지)
const BlockNoteAIEditor = dynamic(
  () => import('../../components/BlockNoteAIEditor'),
  { ssr: false }
);

export default function AICollabPage() {
  const editorRef = useRef<any>(null);

  return (
    <main className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h1 className="text-3xl font-bold">
          🤖 BlockNote AI 협업 에디터
        </h1>
        <p className="text-blue-100 mt-2">
          BlockNote.js 공식 AI 확장 기능 - 블록 선택 → 툴바 AI 버튼 → 명령 입력 → 리라이팅
        </p>
        <div className="mt-4 text-sm text-blue-200">
          <p>💡 <strong>사용법:</strong></p>
          <p>1️⃣ 텍스트 블록 선택 또는 커서 위치</p>
          <p>2️⃣ 툴바에서 🤖 AI 버튼 클릭</p>
          <p>3️⃣ 명령 입력 (예: "한국어로 번역해줘", "어조를 개선해줘")</p>
          <p>4️⃣ 또는 <code>/</code> 입력 후 AI 명령 선택</p>
        </div>
      </header>

      {/* 메인 에디터 */}
      <div className="flex-1 p-8 bg-gray-50">
        <div className="max-w-5xl mx-auto h-full">
          <div className="bg-white rounded-xl shadow-lg border h-full overflow-hidden">
            <div className="p-6 h-full">
              <BlockNoteAIEditor 
                editorRef={editorRef}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 하단 설명 */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <p><strong>블록 선택</strong></p>
              <p>텍스트 블록 클릭</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🛠️</div>
              <p><strong>AI 버튼</strong></p>
              <p>툴바의 🤖 AI 클릭</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <p><strong>명령 입력</strong></p>
              <p>원하는 작업 설명</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">✨</div>
              <p><strong>자동 처리</strong></p>
              <p>AI가 즉시 리라이팅</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}