'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Globe, 
  Sparkles, 
  FileText, 
  CheckCircle,
  Loader2,
  MessageCircle
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'system' | 'success' | 'error';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  editorRef: React.MutableRefObject<any>;
}

export default function ChatInterface({ editorRef }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 환영 메시지 추가 (클라이언트 사이드에서만)
  useEffect(() => {
    setMessages([{
      id: '1',
      type: 'system',
      content: '안녕하세요! 에디터의 텍스트를 AI가 리라이팅해드립니다. 아래 버튼을 사용하거나 직접 요청해보세요.',
      timestamp: new Date()
    }]);
  }, []);

  // 메시지 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 추가
  const addMessage = (type: Message['type'], content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 에디터에서 텍스트 블록 추출
  const extractTextBlocks = () => {
    if (!editorRef.current) {
      throw new Error('에디터를 찾을 수 없습니다.');
    }

    const blocks = editorRef.current.document;
    const textBlocks: any[] = [];
    const preservedElements: any[] = [];

    blocks.forEach((block: any, index: number) => {
      if (block.type === 'paragraph' || block.type === 'heading') {
        const textContent = block.content
          ?.map((item: any) => item.text || '')
          .join('') || '';
        
        if (textContent.trim()) {
          textBlocks.push({
            id: `block_${index}`,
            text: textContent,
            type: block.type,
            props: block.props || {}
          });
        }
      } else {
        // 이미지, 테이블 등 다른 요소들은 보존
        preservedElements.push({
          id: `preserved_${index}`,
          block: block,
          position: index
        });
      }
    });

    return { textBlocks, preservedElements };
  };

  // 처리된 블록을 에디터에 반영
  const updateEditorContent = async (processedBlocks: any[], preservedElements: any[]) => {
    if (!editorRef.current) return;

    const newBlocks: any[] = [];
    let processedIndex = 0;

    // 원본 블록 순서대로 재구성
    const originalBlocks = editorRef.current.document;
    
    originalBlocks.forEach((originalBlock: any, index: number) => {
      const preserved = preservedElements.find(el => el.position === index);
      
      if (preserved) {
        // 보존된 요소 (이미지, 테이블 등)
        newBlocks.push(preserved.block);
      } else if (originalBlock.type === 'paragraph' || originalBlock.type === 'heading') {
        // 텍스트 블록
        const processedBlock = processedBlocks[processedIndex];
        if (processedBlock) {
          newBlocks.push({
            type: processedBlock.type,
            props: originalBlock.props || {},
            content: [
              {
                type: 'text',
                text: processedBlock.text,
                styles: {}
              }
            ]
          });
          processedIndex++;
        }
      }
    });

    // 에디터 내용 업데이트
    editorRef.current.replaceBlocks(editorRef.current.document, newBlocks);
  };

  // 리라이팅 처리
  const handleRewriteRequest = async (action: string, customInstruction?: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      // 에디터에서 콘텐츠 추출
      const { textBlocks, preservedElements } = extractTextBlocks();
      
      if (textBlocks.length === 0) {
        addMessage('error', '처리할 텍스트가 없습니다. 에디터에 텍스트를 입력해주세요.');
        return;
      }

      addMessage('user', customInstruction || getActionDescription(action));
      addMessage('system', '텍스트를 처리 중입니다...');

      // API 호출
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textBlocks,
          action,
          customInstruction
        }),
      });

      if (!response.ok) {
        throw new Error('서버 오류가 발생했습니다.');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // 결과를 에디터에 반영
      await updateEditorContent(data.processedBlocks, preservedElements);
      
      addMessage('success', `✅ ${getActionDescription(action)} 완료!`);
      
    } catch (error) {
      console.error('리라이팅 오류:', error);
      addMessage('error', `❌ 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 액션 설명 가져오기
  const getActionDescription = (action: string) => {
    const descriptions: { [key: string]: string } = {
      'translate': '한국어로 번역',
      'improve-tone': '어조 개선',
      'summarize': '요약',
      'grammar': '맞춤법 교정'
    };
    return descriptions[action] || action;
  };

  // 사용자 메시지 처리
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const message = inputMessage.trim();
    setInputMessage('');
    
    await handleRewriteRequest('custom', message);
  };

  // 엔터키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l">
      {/* 헤더 */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          AI 리라이터
        </h2>
        <p className="text-sm text-gray-600 mt-1">텍스트를 선택하고 리라이팅을 요청하세요</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg max-w-[85%] ${
              message.type === 'user'
                ? 'bg-blue-500 text-white ml-auto'
                : message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : message.type === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-white text-gray-800 border'
            }`}
          >
            <p className="text-sm">{message.content}</p>
            <p className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 빠른 액션 버튼 */}
      <div className="p-4 border-t bg-white">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handleRewriteRequest('translate')}
            disabled={isProcessing}
            className="flex items-center gap-2 p-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Globe className="w-4 h-4" />
            번역
          </button>
          <button
            onClick={() => handleRewriteRequest('improve-tone')}
            disabled={isProcessing}
            className="flex items-center gap-2 p-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            어조 개선
          </button>
          <button
            onClick={() => handleRewriteRequest('summarize')}
            disabled={isProcessing}
            className="flex items-center gap-2 p-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            요약
          </button>
          <button
            onClick={() => handleRewriteRequest('grammar')}
            disabled={isProcessing}
            className="flex items-center gap-2 p-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            교정
          </button>
        </div>

        {/* 메시지 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="커스텀 요청을 입력하세요..."
            disabled={isProcessing}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}