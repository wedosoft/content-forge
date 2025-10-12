// BlockNote 관련 타입 정의
export interface TextBlock {
  id: string;
  text: string;
  type: 'paragraph' | 'heading';
  props?: any;
}

export interface PreservedElement {
  id: string;
  block: any;
  position: number;
}

export interface RewriteRequest {
  textBlocks: TextBlock[];
  action: 'translate' | 'improve-tone' | 'summarize' | 'grammar' | 'custom';
  customInstruction?: string;
}

export interface RewriteResponse {
  processedBlocks: TextBlock[];
  error?: string;
}

// 채팅 메시지 타입
export interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'success' | 'error';
  content: string;
  timestamp: Date;
}