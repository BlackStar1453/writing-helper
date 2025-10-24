'use client';

import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { WritingModal, WritingModalRef } from './WritingModal';
import {
  parseMessageOptions,
  removeOptionTags,
  WritingData,
  parseAISuggestions,
  removeAISuggestionsTags,
  AISuggestion,
  AIStructuredSuggestion,
  ChatSession,
  ChatMessage as ChatMsg,
  WritingHistory,
  GuidedWritingData
} from '@/lib/writing-utils';
import {
  getAllChatSessions,
  saveAllChatSessions,
  getAllWritingHistories,
  saveAllWritingHistories
} from '@/lib/db-utils';

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

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  errors: ErrorInfo[];
  initialMessage?: string;
  apiToken?: string;
  aiProvider?: string;
  aiModel?: string;
  onOpenSettings?: () => void;
  tutorialText?: string; // 教程文本
  showTutorial?: boolean; // 是否显示教程
}

export function AgentModal({ isOpen, onClose, text, errors, initialMessage, apiToken = '', aiProvider = 'openai', aiModel = 'gpt-4o-mini', onOpenSettings, tutorialText = '', showTutorial = false }: AgentModalProps) {
  // Main Agent (初始界面)
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { text, errors, agentType: 'main', apiToken, aiProvider, aiModel },
    }),
  });

  // Chat会话管理
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  // 写作历史管理
  const [writingHistories, setWritingHistories] = useState<WritingHistory[]>([]);
  const [currentWritingId, setCurrentWritingId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false); // 是否显示分析结果
  const [currentAISuggestions, setCurrentAISuggestions] = useState<AISuggestion[]>([]);
  const [currentAgentFeedback, setCurrentAgentFeedback] = useState<string>('');
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false); // 标记是否正在加载AI建议

  const [currentWritingText, setCurrentWritingText] = useState<string>(''); // 保存当前写作内容作为上下文

  // AI结构化建议 (从API获取)
  const [mockAISuggestions, setMockAISuggestions] = useState<AIStructuredSuggestion[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);
  const writingModalRef = useRef<WritingModalRef>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  // 从IndexedDB加载chat会话
  useEffect(() => {
    getAllChatSessions()
      .then(sessions => {
        if (sessions && sessions.length > 0) {
          setChatSessions(sessions);
        }
      })
      .catch(e => {
        console.error('Failed to load chat sessions from IndexedDB:', e);
      });
  }, []);

  // 保存chat会话到IndexedDB
  useEffect(() => {
    if (chatSessions.length > 0) {
      saveAllChatSessions(chatSessions).catch(e => {
        console.error('Failed to save chat sessions to IndexedDB:', e);
      });
    }
  }, [chatSessions]);

  // 从IndexedDB加载写作历史
  useEffect(() => {
    getAllWritingHistories()
      .then(histories => {
        if (histories && histories.length > 0) {
          setWritingHistories(histories);
        }
      })
      .catch(e => {
        console.error('Failed to load writing histories from IndexedDB:', e);
      });
  }, []);

  // 保存写作历史到IndexedDB
  useEffect(() => {
    if (writingHistories.length > 0) {
      saveAllWritingHistories(writingHistories).catch(e => {
        console.error('Failed to save writing histories to IndexedDB:', e);
      });
    }
  }, [writingHistories]);

  // Set initial message when modal opens
  useEffect(() => {
    if (isOpen && initialMessage) {
      // 检查是否是特殊的打开WritingModal指令
      if (initialMessage === '[OPEN_WRITING_MODAL]') {
        setShowAnalysisResults(false);
        setIsWritingModalOpen(true);

        // 如果是教程模式,添加初始AI suggestions
        if (showTutorial && tutorialText) {
          // 为教程文本中的错误添加AI suggestions (多种类型)
          const initialSuggestions: AIStructuredSuggestion[] = [
            {
              start: tutorialText.indexOf('help you'),
              end: tutorialText.indexOf('help you') + 'help'.length,
              type: 'Grammar',
              message: 'Subject-verb agreement: "tool" is singular, use "helps" instead of "help"',
              problemText: 'help',
              replacements: ['helps']
            },
            {
              start: tutorialText.indexOf('more better'),
              end: tutorialText.indexOf('more better') + 'more better'.length,
              type: 'Grammar',
              message: 'Double comparative: use either "better" or "more good", not both',
              problemText: 'more better',
              replacements: ['better']
            },
            {
              start: tutorialText.indexOf('automaticaly'),
              end: tutorialText.indexOf('automaticaly') + 'automaticaly'.length,
              type: 'Spelling',
              message: 'Spelling error: missing double "l"',
              problemText: 'automaticaly',
              replacements: ['automatically']
            },
            {
              start: tutorialText.indexOf('grammer'),
              end: tutorialText.indexOf('grammer') + 'grammer'.length,
              type: 'Spelling',
              message: 'Common spelling mistake: "grammer" should be "grammar"',
              problemText: 'grammer',
              replacements: ['grammar']
            },
            {
              start: tutorialText.indexOf('your ready'),
              end: tutorialText.indexOf('your ready') + 'your'.length,
              type: 'Grammar',
              message: 'Incorrect word: "your" (possessive) vs "you\'re" (you are)',
              problemText: 'your',
              replacements: ["you're"]
            },
            {
              start: tutorialText.indexOf('sugestions'),
              end: tutorialText.indexOf('sugestions') + 'sugestions'.length,
              type: 'Spelling',
              message: 'Spelling error: double "g" needed',
              problemText: 'sugestions',
              replacements: ['suggestions']
            },
            {
              start: tutorialText.indexOf('formal casual'),
              end: tutorialText.indexOf('formal casual') + 'formal casual'.length,
              type: 'Punctuation',
              message: 'Missing comma between coordinate adjectives',
              problemText: 'formal casual',
              replacements: ['formal, casual']
            },
            {
              start: tutorialText.indexOf('your done'),
              end: tutorialText.indexOf('your done') + 'your'.length,
              type: 'Grammar',
              message: 'Incorrect word: "your" (possessive) vs "you\'re" (you are)',
              problemText: 'your',
              replacements: ["you're"]
            },
            {
              start: tutorialText.indexOf('writting'),
              end: tutorialText.indexOf('writting') + 'writting'.length,
              type: 'Spelling',
              message: 'Common spelling error: single "t" needed',
              problemText: 'writting',
              replacements: ['writing']
            }
          ].filter(s => s.start >= 0); // 过滤掉找不到的错误

          setMockAISuggestions(initialSuggestions);
          setShowAnalysisResults(true); // 显示分析结果
        }
      } else {
        setInput(initialMessage);
      }
    }
  }, [isOpen, initialMessage, showTutorial, tutorialText]);

  // Check if user manually scrolled
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      isAutoScrollRef.current = isNearBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 移除自动打开反馈模式的逻辑
  // 现在用户通过点击"提交分析"按钮来显示AI suggestions

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    await sendMessage({
      text: userMessage,
    });
  };

  // 处理选项点击
  const handleOptionClick = (option: string, aiSuggestions: AISuggestion[] = [], messageContent?: string) => {
    if (option === '开始写作') {
      // 尝试从消息中解析引导写作数据
      let guidedData: GuidedWritingData | null = null;

      if (messageContent) {
        try {
          // 查找JSON数据标记 - 使用贪婪匹配来获取完整的JSON
          const jsonMatch = messageContent.match(/\[GUIDED_DATA:(.*)\]/s);
          if (jsonMatch) {
            guidedData = JSON.parse(jsonMatch[1]);
          }
        } catch (error) {
          console.error('Failed to parse guided writing data:', error);
        }
      }

      setShowAnalysisResults(false);
      setCurrentAISuggestions([]);
      setIsWritingModalOpen(true);

      // 如果有引导写作数据,启动引导模式
      if (guidedData && writingModalRef.current) {
        writingModalRef.current.startGuidedWriting(guidedData);
      }
    } else if (option === '查看反馈') {
      setShowAnalysisResults(true);
      setCurrentAISuggestions(aiSuggestions);
      setIsWritingModalOpen(true);
    }
    // 可以扩展其他选项的处理
  };

  // 更新AI建议列表
  const updateAISuggestions = (suggestions: AIStructuredSuggestion[]) => {
    setMockAISuggestions(suggestions);
  };

  // 处理写作提交
  const handleWritingSubmit = async (data: WritingData) => {
    // 保存当前写作内容
    setCurrentWritingText(data.userText);

    // 显示分析结果
    setShowAnalysisResults(true);

    // 显示loading状态
    setIsLoadingAISuggestions(true);

    console.log('Submitting text to analyze API:', data.userText);

    // 异步调用analyze API获取AI结构化建议
    fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: data.userText,
        apiToken,
        aiModel
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          console.log('AI suggestions received:', result.suggestions);
          // 更新AI建议
          setMockAISuggestions(result.suggestions || []);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to get AI suggestions:', errorData);

          // 如果是API token未设置错误,显示提示
          if (errorData.error === 'API_TOKEN_NOT_SET') {
            setMockAISuggestions([{
              start: 0,
              end: 0,
              type: 'Error',
              message: '⚠️ API Token未设置。请点击右上角的设置按钮,输入您的API Token后再试。\n\n⚠️ API Token not set. Please click the settings button in the top right corner and enter your API Token.',
              problemText: '',
              replacements: []
            }]);
          } else {
            // 其他错误,清空建议
            setMockAISuggestions([]);
          }
        }
      })
      .catch((error) => {
        console.error('Error calling analyze API:', error);
        // 如果出错,清空建议
        setMockAISuggestions([]);
      })
      .finally(() => {
        setIsLoadingAISuggestions(false);
      });

    // 不再自动发送"我完成了写作"消息给Feedback Agent
    // AI suggestions已经通过/api/analyze获取
  };

  // 创建新的chat会话
  const createNewChatSession = (actionType?: string, initialMessage?: string): string => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const title = initialMessage
      ? initialMessage.substring(0, 30) + (initialMessage.length > 30 ? '...' : '')
      : 'New Chat';

    const newSession: ChatSession = {
      id: sessionId,
      title,
      messages: [],
      createdAt: Date.now(),
      actionType
    };

    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    return sessionId;
  };

  // 获取当前会话
  const getCurrentSession = (): ChatSession | undefined => {
    return chatSessions.find(s => s.id === currentSessionId);
  };

  // 发送消息到当前会话
  const handleWritingAgentSend = async (message: string, actionType?: string) => {
    // 如果没有当前会话或需要新建会话,创建新会话
    let sessionId = currentSessionId;
    if (!sessionId || actionType) {
      sessionId = createNewChatSession(actionType, message);
    }

    // 获取当前会话的消息历史(在更新之前)
    const currentSession = chatSessions.find(s => s.id === sessionId);
    const messagesHistory = currentSession ? currentSession.messages : [];

    // 添加用户消息到当前会话
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [...session.messages, { role: 'user', content: message }]
        };
      }
      return session;
    }));

    // 调用API获取AI响应
    setIsAssistantLoading(true);
    try {
      const messages = [...messagesHistory, { role: 'user', content: message }];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            parts: [{ type: 'text', text: msg.content }]
          })),
          agentType: 'main',
          apiToken,
          aiProvider,
          aiModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'API_TOKEN_NOT_SET') {
          // 显示API token未设置的错误消息
          setChatSessions(prev => prev.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: [...session.messages, {
                  role: 'assistant',
                  content: '⚠️ API Token未设置。请点击右上角的设置按钮,输入您的API Token后再试。\n\n⚠️ API Token not set. Please click the settings button in the top right corner and enter your API Token.'
                }]
              };
            }
            return session;
          }));
          setIsAssistantLoading(false);
          return;
        }
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // 添加空的assistant消息用于流式更新
      setChatSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: [...session.messages, { role: 'assistant', content: '' }]
          };
        }
        return session;
      }));

      // 读取流式响应
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          // Vercel AI SDK SSE format: "data: {json}"
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6); // Remove "data: " prefix
            if (jsonStr === '[DONE]') break;

            try {
              const data = JSON.parse(jsonStr);

              // Handle text-delta events
              if (data.type === 'text-delta' && data.delta) {
                assistantMessage += data.delta;
                // 更新assistant消息
                setChatSessions(prev => prev.map(session => {
                  if (session.id === sessionId) {
                    const updatedMessages = [...session.messages];
                    updatedMessages[updatedMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage
                    };
                    return { ...session, messages: updatedMessages };
                  }
                  return session;
                }));
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  // 获取当前会话的消息
  const getAgentMessages = (): Array<{ role: 'user' | 'assistant'; content: string }> => {
    const currentSession = getCurrentSession();
    return currentSession ? currentSession.messages : [];
  };

  // 切换到指定的chat会话
  const handleSelectChatSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  // 删除指定的chat会话
  const handleDeleteChatSession = (sessionId: string) => {
    setChatSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      // 如果删除后列表为空,清除IndexedDB
      if (newSessions.length === 0) {
        saveAllChatSessions([]).catch(e => {
          console.error('Failed to clear chat sessions from IndexedDB:', e);
        });
      }
      return newSessions;
    });
    // 如果删除的是当前会话,清空当前会话ID
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  // 保存写作历史
  const handleSaveWritingHistory = (content: string) => {
    const now = Date.now();
    const title = content.substring(0, 30) + (content.length > 30 ? '...' : '');

    if (currentWritingId) {
      // 更新现有记录
      setWritingHistories(prev =>
        prev.map(h =>
          h.id === currentWritingId
            ? { ...h, title, content, updatedAt: now }
            : h
        )
      );
    } else {
      // 创建新记录
      const historyId = `writing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newHistory: WritingHistory = {
        id: historyId,
        title,
        content,
        createdAt: now,
        updatedAt: now
      };

      setWritingHistories(prev => [newHistory, ...prev]);
      setCurrentWritingId(historyId);
    }
  };

  // 删除写作历史
  const handleDeleteWritingHistory = (historyId: string) => {
    setWritingHistories(prev => {
      const newHistories = prev.filter(h => h.id !== historyId);
      // 如果删除后列表为空,清除IndexedDB
      if (newHistories.length === 0) {
        saveAllWritingHistories([]).catch(e => {
          console.error('Failed to clear writing histories from IndexedDB:', e);
        });
      }
      return newHistories;
    });
    // 如果删除的是当前编辑的记录,清除currentWritingId
    if (currentWritingId === historyId) {
      setCurrentWritingId(null);
    }
  };

  // 加载写作历史
  const handleLoadWritingHistory = (historyId: string): string | null => {
    const history = writingHistories.find(h => h.id === historyId);
    if (history) {
      setCurrentWritingId(historyId);
      return history.content;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Writing Assistant</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get detailed explanations and suggestions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* System Message */}
          <div className="flex justify-center">
            <div className="max-w-md px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-sm rounded-lg text-center">
              Hello! I'm your AI writing assistant. Ask me anything about your writing!
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg, idx) => {
            let contentText = '';
            if (msg.parts && Array.isArray(msg.parts)) {
              contentText = msg.parts
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('');
            }

            // Extract tool invocations from message parts
            const toolInvocations = msg.parts && Array.isArray(msg.parts)
              ? msg.parts
                  .filter((part: any) => part.type === 'tool-call' || part.type === 'tool-result')
                  .map((part: any) => {
                    if (part.type === 'tool-call') {
                      return {
                        state: 'call' as const,
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        args: part.args,
                      };
                    } else if (part.type === 'tool-result') {
                      return {
                        state: 'result' as const,
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        result: part.result,
                      };
                    }
                    return null;
                  })
                  .filter(Boolean)
              : [];

            // 解析选项和AI建议 (只对assistant消息解析)
            const options = msg.role === 'assistant' ? parseMessageOptions(contentText) : [];
            const aiSuggestions = msg.role === 'assistant' ? parseAISuggestions(contentText) : [];
            // 保存原始内容用于handleOptionClick
            const originalContent = contentText;
            let cleanContent = removeOptionTags(contentText);
            cleanContent = removeAISuggestionsTags(cleanContent);

            return (
              <div key={msg.id ?? idx}>
                <ChatMessage
                  role={msg.role as 'user' | 'assistant' | 'system'}
                  content={cleanContent}
                  isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
                  toolInvocations={toolInvocations as any}
                />

                {/* 显示选项按钮 */}
                {options.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-2 mt-2 px-4">
                    {options.map((option, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleOptionClick(option, aiSuggestions, originalContent)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                      >
                        {option === '开始写作' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        ) : option === '查看反馈' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : null}
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about this suggestion..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Writing Modal */}
      <WritingModal
        ref={writingModalRef}
        isOpen={isWritingModalOpen}
        onClose={() => {
          setIsWritingModalOpen(false);
          setShowAnalysisResults(false);
        }}
        onSubmit={handleWritingSubmit}
        agentMessages={getAgentMessages()}
        onAgentSendMessage={handleWritingAgentSend}
        isAgentLoading={isAssistantLoading}
        onTextChange={setCurrentWritingText}
        aiSuggestions={mockAISuggestions}
        apiToken={apiToken}
        aiModel={aiModel}
        isLoadingAISuggestions={isLoadingAISuggestions}
        onUpdateAISuggestions={updateAISuggestions}
        showAnalysisResults={showAnalysisResults}
        chatSessions={chatSessions}
        onSelectChatSession={handleSelectChatSession}
        onDeleteChatSession={handleDeleteChatSession}
        writingHistories={writingHistories}
        onSaveWritingHistory={handleSaveWritingHistory}
        onDeleteWritingHistory={handleDeleteWritingHistory}
        onLoadWritingHistory={handleLoadWritingHistory}
        currentWritingId={currentWritingId}
        onClearCurrentWriting={() => setCurrentWritingId(null)}
        onOpenSettings={onOpenSettings}
        tutorialText={tutorialText}
        showTutorial={showTutorial}
      />
    </div>
  );
}
