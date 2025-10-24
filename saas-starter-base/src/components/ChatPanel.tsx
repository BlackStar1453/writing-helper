'use client';

import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

interface ErrorInfo {
  type: string;
  typePretty: string;
  message: string;
  messageHtml: string;
  problemText: string;
  position: { start: number; end: number };
  suggestions: Array<{
    kind: number;
    replacementText: string;
  }>;
  json: string;
}

interface ChatPanelProps {
  text: string;
  errors: ErrorInfo[];
}

export function ChatPanel({ text, errors }: ChatPanelProps) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { text, errors },
    }),
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  const isLoading = status === 'submitted' || status === 'streaming';

  // 检测用户是否手动滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 如果用户滚动到接近底部(50px 范围内),启用自动滚动
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      isAutoScrollRef.current = isNearBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 自动滚动到底部(仅当用户未手动滚动时)
  useEffect(() => {
    if (isAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 监听外部预填事件（从编辑器派发）
  useEffect(() => {
    const handler = (e: any) => {
      const msg = e?.detail?.message as string | undefined;
      if (typeof msg === 'string') {
        setInput(msg);
      }
    };
    window.addEventListener('agent:prefill', handler as any);
    return () => window.removeEventListener('agent:prefill', handler as any);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput(''); // 清空输入框

    // 使用 sendMessage 发送消息 (AI SDK 5.0 格式)
    await sendMessage({
      text: userMessage,
    });
  };

  return (
    <div id="chat-panel" className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Writing Assistant
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {errors.length > 0 ? `${errors.length} issues detected` : 'No issues detected'}
        </p>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {/* Static greeting */}
        <ChatMessage
          role="system"
          content={"Hello! I'm your writing assistant. I can help you with grammar, style, and writing tips."}
          isStreaming={false}
        />
        {messages.map((msg, idx) => {
          // AI SDK 5.0 messages use parts array
          let contentText = '';
          if (msg.parts && Array.isArray(msg.parts)) {
            // Extract text from parts array
            contentText = msg.parts
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join('');
          }

          return (
            <ChatMessage
              key={msg.id ?? idx}
              role={msg.role as 'user' | 'assistant' | 'system'}
              content={contentText}
              isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your writing..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !String(input ?? '').trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300
                     text-white rounded-lg transition-colors font-medium
                     disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
