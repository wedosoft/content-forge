'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Globe,
  ChevronDown,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 초기 환영 메시지 추가 (클라이언트 사이드에서만)
  useEffect(() => {
    setMessages([{
      id: '1',
      type: 'system',
      content: '안녕하세요! 에디터의 텍스트를 AI가 리라이팅해드립니다. 아래 버튼을 사용하거나 직접 요청해보세요.',
      timestamp: new Date()
    }]);
  }, []);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      if (block.type === 'paragraph' || block.type === 'heading' ||
          block.type === 'bulletListItem' || block.type === 'numberedListItem') {
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
      } else if (originalBlock.type === 'paragraph' || originalBlock.type === 'heading' ||
                 originalBlock.type === 'bulletListItem' || originalBlock.type === 'numberedListItem') {
        // 텍스트 블록 (리스트 포함)
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
      'grammar': '맞춤법 교정',
      'expand': '내용 확장',
      'simplify': '쉽게 풀어쓰기',
      'professional': '전문적으로 변환',
      'seo': 'SEO 최적화'
    };
    return descriptions[action] || action;
  };

  // 드롭다운 옵션 선택 핸들러
  const handleStyleSelect = async (action: string) => {
    setIsDropdownOpen(false);
    await handleRewriteRequest(action);
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
    <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          AI 리라이터
        </h2>
        <p className="text-sm text-muted-foreground mt-1">텍스트를 선택하고 리라이팅을 요청하세요</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg max-w-[85%] ${
              message.type === 'user'
                ? 'bg-primary text-primary-foreground ml-auto'
                : message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                : message.type === 'error'
                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                : 'bg-muted text-foreground border'
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
      <div className="p-4 border-t">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handleRewriteRequest('translate')}
            disabled={isProcessing}
            className="flex items-center gap-2 p-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Globe className="w-4 h-4" />
            번역
          </button>

          {/* 스타일 변경 드롭다운 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isProcessing}
              className="w-full flex items-center justify-between gap-2 p-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <span>✨ 스타일 변경</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border rounded-md shadow-lg z-10">
                <button
                  onClick={() => handleStyleSelect('grammar')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent first:rounded-t-md"
                >
                  ✓ 맞춤법 교정
                </button>
                <button
                  onClick={() => handleStyleSelect('expand')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                >
                  📝 내용 확장
                </button>
                <button
                  onClick={() => handleStyleSelect('simplify')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                >
                  💡 쉽게 풀어쓰기
                </button>
                <button
                  onClick={() => handleStyleSelect('professional')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                >
                  💼 전문적으로
                </button>
                <button
                  onClick={() => handleStyleSelect('seo')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent last:rounded-b-md"
                >
                  🔍 SEO 최적화
                </button>
              </div>
            )}
          </div>
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
            className="flex-1 p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !inputMessage.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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