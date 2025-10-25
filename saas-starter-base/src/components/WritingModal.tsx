'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import {
  WritingData,
  ErrorInfo,
  AIStructuredSuggestion,
  ChatSession,
  WritingHistory,
  GuidedWritingData,
  WritingStep,
  StepResult,
  StepEvaluation
} from '@/lib/writing-utils';
import { MarkdownContent } from './MarkdownContent';
import { NovelContext, ChapterTimelineItem } from '@/lib/novel/types';
import { NovelContextPanel } from './novel/NovelContextPanel';
import { TimelinePanel, CandidateVersions, ContentVersion } from './novel/TimelinePanel';
import { cleanContentForDisplay } from '@/lib/novel/content-utils';
import { useMenus } from '@/lib/novel/hooks/use-menus';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';
import { useCharacters } from '@/lib/novel/hooks/use-characters';

interface WritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WritingData) => void;
  // Agent聊天相关props
  agentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onAgentSendMessage?: (message: string, actionType?: string) => void;
  isAgentLoading?: boolean;
  onTextChange?: (text: string) => void; // 通知父组件文本变化
  initialText?: string; // 初始文本内容
  aiSuggestions?: AIStructuredSuggestion[]; // AI结构化建议
  isLoadingAISuggestions?: boolean; // 是否正在加载AI建议
  onUpdateAISuggestions?: (suggestions: AIStructuredSuggestion[]) => void; // 更新AI建议列表
  showAnalysisResults?: boolean; // 是否显示分析结果
  // Chat历史记录相关props
  chatSessions?: ChatSession[];
  onSelectChatSession?: (sessionId: string) => void;
  onDeleteChatSession?: (sessionId: string) => void;
  // 写作历史记录相关props
  writingHistories?: WritingHistory[];
  onSaveWritingHistory?: (content: string) => void;
  onDeleteWritingHistory?: (historyId: string) => void;
  onLoadWritingHistory?: (historyId: string) => string | null;
  currentWritingId?: string | null;
  onClearCurrentWriting?: () => void;
  // 设置相关props
  onOpenSettings?: () => void;
  // API设置
  apiToken?: string;
  aiModel?: string;
  // 教程相关props
  tutorialText?: string;
  showTutorial?: boolean;
  // 小说上下文相关props
  novelContext?: NovelContext;
  onNovelContextChange?: (context: NovelContext) => void;
  onGenerateDraft?: () => void;
  isGeneratingDraft?: boolean;
  // 时间线相关props
  timeline?: ChapterTimelineItem[];
  onTimelineChange?: (timeline: ChapterTimelineItem[]) => void;
  onGenerateTimelineContent?: (timelineItem: ChapterTimelineItem, index: number) => void;
  generatingTimelineItemId?: string | null;
  candidateVersions?: CandidateVersions | null;
  onApplyVersion?: (version: ContentVersion) => void;
  onClearCandidates?: () => void;
  onJumpToTimelineContent?: (timelineItemId: string) => void;
}

// 导出ref方法接口
export interface WritingModalRef {
  startGuidedWriting: (data: GuidedWritingData) => void;
}

export const WritingModal = forwardRef<WritingModalRef, WritingModalProps>((props, ref) => {
  const {
    isOpen,
    onClose,
    onSubmit,
    agentMessages = [],
    onAgentSendMessage,
    isAgentLoading = false,
    onTextChange,
    initialText = '',
    aiSuggestions = [],
    isLoadingAISuggestions = false,
    onUpdateAISuggestions,
    showAnalysisResults = false,
    chatSessions = [],
    onSelectChatSession,
    onDeleteChatSession,
    writingHistories = [],
    onSaveWritingHistory,
    onDeleteWritingHistory,
    onLoadWritingHistory,
    currentWritingId = null,
    onClearCurrentWriting,
    onOpenSettings,
    apiToken = '',
    aiModel = 'gpt-4o-mini',
    tutorialText = '',
    showTutorial = false,
    novelContext,
    onNovelContextChange,
    onGenerateDraft,
    isGeneratingDraft = false,
    timeline = [],
    onTimelineChange,
    onGenerateTimelineContent,
    generatingTimelineItemId,
    candidateVersions,
    onApplyVersion,
    onClearCandidates,
    onJumpToTimelineContent
  } = props;

  // 加载Menu卡片
  const { menus, getEnabledMenus } = useMenus(novelContext?.novelId || '');
  const enabledMenus = getEnabledMenus ? getEnabledMenus() : menus.filter(m => m.enabled);
  const { prompts } = usePrompts(novelContext?.novelId || '');
  const { characters } = useCharacters(novelContext?.novelId || '');

  // 清理Timeline标记用于显示
  const [text, setText] = useState(cleanContentForDisplay(initialText));

  // 当initialText变化时更新text状态
  useEffect(() => {
    setText(cleanContentForDisplay(initialText));
  }, [initialText]);

  // 监听跳转到Timeline内容的事件
  useEffect(() => {
    const handleJumpToContent = (e: CustomEvent) => {
      const { timelineItemId } = e.detail;
      if (!textareaRef.current) return;

      // 在原始内容(带标记)中查找标记位置
      const marker = `<!-- TIMELINE_NODE:${timelineItemId} -->`;
      const markerIndex = initialText.indexOf(marker);

      if (markerIndex === -1) {
        // 如果找不到标记,说明这个节点还没有生成内容
        alert('该时间线节点还没有生成对应的内容');
        return;
      }

      // 计算标记之前有多少行
      const textBeforeMarker = initialText.substring(0, markerIndex);
      const linesBefore = textBeforeMarker.split('\n').length;

      // 获取textarea的行高
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);

      // 计算滚动位置(留一些余量,让标记位置在视口中间)
      const scrollTop = Math.max(0, (linesBefore - 5) * lineHeight);

      // 滚动到对应位置
      textareaRef.current.scrollTop = scrollTop;

      // 同步高亮层的滚动
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
      }

      // 可选: 高亮显示该区域(通过临时选中文本)
      // 找到标记结束位置
      const endMarker = '<!-- /TIMELINE_NODE -->';
      const endMarkerIndex = initialText.indexOf(endMarker, markerIndex);
      if (endMarkerIndex !== -1) {
        // 计算在清理后的text中的位置
        // 我们需要计算标记之前有多少个标记,然后减去这些标记的长度
        const textBeforeMarkerInOriginal = initialText.substring(0, markerIndex);
        const markersBefore = (textBeforeMarkerInOriginal.match(/<!-- TIMELINE_NODE:.*? -->/g) || []).length;
        const endMarkersBefore = (textBeforeMarkerInOriginal.match(/<!-- \/TIMELINE_NODE -->/g) || []).length;

        // 计算清理后的起始位置
        const cleanedStartPos = markerIndex - markersBefore * marker.length - endMarkersBefore * endMarker.length;

        // 计算内容长度(不包括标记)
        const contentWithMarkers = initialText.substring(markerIndex + marker.length, endMarkerIndex);
        const contentLength = contentWithMarkers.length;

        // 选中这段内容(包括标记)
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cleanedStartPos, cleanedStartPos + contentLength);

        // 1秒后取消选中
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(cleanedStartPos, cleanedStartPos);
          }
        }, 1000);
      }
    };

    window.addEventListener('jump-to-timeline-content', handleJumpToContent as EventListener);
    return () => {
      window.removeEventListener('jump-to-timeline-content', handleJumpToContent as EventListener);
    };
  }, [initialText]);
  const [rightPanelView, setRightPanelView] = useState<'suggestions' | 'agent' | 'novelContext' | 'timeline'>('suggestions'); // 右侧面板切换,默认显示suggestions
  const [agentInput, setAgentInput] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null); // 选中的suggestion索引
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null); // popover位置
  const [showPopover, setShowPopover] = useState(false); // 是否显示popover
  const [selectionPopup, setSelectionPopup] = useState<{ show: boolean; selectedText: string; context: string; position: { x: number; y: number } }>({
    show: false,
    selectedText: '',
    context: '',
    position: { x: 0, y: 0 }
  }); // 文本选择popup
  const [showHistorySidebar, setShowHistorySidebar] = useState(false); // 是否显示chat历史记录侧边栏
  const [showWritingHistorySidebar, setShowWritingHistorySidebar] = useState(false); // 是否显示写作历史记录侧边栏

  // 引导写作相关状态
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedData, setGuidedData] = useState<GuidedWritingData | null>(null);
  const [currentStepContent, setCurrentStepContent] = useState('');
  const [stepEvaluation, setStepEvaluation] = useState<StepEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showProgress, setShowProgress] = useState(false); // Progress区域是否展开
  const [showTips, setShowTips] = useState(false); // Tips区域是否展开

  const linterRef = useRef<any>(null);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectionPopupRef = useRef<HTMLDivElement>(null);
  const historySidebarRef = useRef<HTMLDivElement>(null);
  const writingHistorySidebarRef = useRef<HTMLDivElement>(null);

  // 移除自动切换视图的逻辑,用户可以手动切换

  // 通知父组件文本变化
  useEffect(() => {
    if (onTextChange) {
      onTextChange(text);
    }
  }, [text, onTextChange]);

  // 在引导模式下同步text和currentStepContent
  useEffect(() => {
    if (guidedMode) {
      setCurrentStepContent(text);
    }
  }, [text, guidedMode]);





  // 教程模式:预填充教程文本
  useEffect(() => {
    if (isOpen && showTutorial && tutorialText && !text) {
      setText(tutorialText);
      // 标记用户已看过教程
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  }, [isOpen, showTutorial, tutorialText]);

  // Agent消息自动滚动
  useEffect(() => {
    if (agentMessagesEndRef.current) {
      agentMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages]);

  // 点击外部关闭chat历史侧边栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHistorySidebar && historySidebarRef.current && !historySidebarRef.current.contains(event.target as Node)) {
        setShowHistorySidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistorySidebar]);

  // 点击外部关闭写作历史侧边栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWritingHistorySidebar && writingHistorySidebarRef.current && !writingHistorySidebarRef.current.contains(event.target as Node)) {
        setShowWritingHistorySidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWritingHistorySidebar]);
  


  // 应用AI建议
  const applyAISuggestion = (suggestion: AIStructuredSuggestion, replacement: string) => {
    console.log('Applying AI suggestion:', {
      start: suggestion.start,
      end: suggestion.end,
      problemText: suggestion.problemText,
      replacement: replacement,
      textLength: text.length,
      originalText: text.substring(suggestion.start, suggestion.end)
    });

    const before = text.substring(0, suggestion.start);
    const after = text.substring(suggestion.end);
    const newText = before + replacement + after;

    console.log('New text:', newText);
    setText(newText);

    // 通知父组件文本变化
    if (onTextChange) {
      onTextChange(newText);
    }

    // 计算位置变化量
    const originalLength = suggestion.end - suggestion.start;
    const newLength = replacement.length;
    const delta = newLength - originalLength;

    console.log('Position delta:', delta);

    // 更新所有后续建议的位置
    if (aiSuggestions && aiSuggestions.length > 0) {
      const updatedSuggestions = aiSuggestions
        .filter(s => {
          // 移除已应用的建议(通过位置和内容比较)
          const isSameSuggestion = s.start === suggestion.start &&
                                   s.end === suggestion.end &&
                                   s.problemText === suggestion.problemText;
          return !isSameSuggestion;
        })
        .map((s) => {
          // 如果建议在当前修改位置之后,需要调整位置
          if (s.start >= suggestion.end) {
            return {
              ...s,
              start: s.start + delta,
              end: s.end + delta
            };
          }
          // 如果建议在当前修改位置之前,不需要调整
          return s;
        });

      console.log('Removed applied suggestion, updated suggestions:', updatedSuggestions);

      // 通知父组件更新建议列表
      if (onUpdateAISuggestions) {
        onUpdateAISuggestions(updatedSuggestions);
      }
    }
  };
  
  // 提交处理 (写作模式)
  const handleSubmit = () => {
    if (!text.trim()) {
      alert('请输入内容后再提交');
      return;
    }

    // 写作模式下不需要Harper检测,传递空数组
    onSubmit({ userText: text, errors: [] });
  };

  // 关闭处理
  const handleClose = () => {
    onClose();
  };

  // Agent发送消息
  const handleAgentSend = () => {
    if (!agentInput.trim() || !onAgentSendMessage) return;
    onAgentSendMessage(agentInput);
    setAgentInput('');
  };

  // 生成带高亮的HTML
  const generateHighlightedHTML = () => {
    if (!showAnalysisResults || aiSuggestions.length === 0) {
      // 没有分析结果时,直接返回转义的文本
      return escapeHtml(text);
    }

    // 按start位置排序suggestions
    const sortedSuggestions = [...aiSuggestions].sort((a, b) => a.start - b.start);

    let html = '';
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion, index) => {
      // 添加suggestion之前的正常文本
      html += escapeHtml(text.substring(lastIndex, suggestion.start));

      // 添加高亮的错误文本
      const errorText = text.substring(suggestion.start, suggestion.end);
      html += `<mark class="error-highlight" data-suggestion-index="${index}" style="background-color: rgba(239, 68, 68, 0.2); cursor: pointer; border-bottom: 2px solid rgb(239, 68, 68);">${escapeHtml(errorText)}</mark>`;

      lastIndex = suggestion.end;
    });

    // 添加最后一个suggestion之后的文本
    html += escapeHtml(text.substring(lastIndex));

    return html;
  };

  // HTML转义函数
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br/>');
  };

  // 同步滚动
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // 处理高亮区域点击
  const handleHighlightClick = (e: React.MouseEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    if (!showAnalysisResults || aiSuggestions.length === 0) return;

    // 获取点击位置
    const textarea = textareaRef.current;
    if (!textarea) return;

    const clickX = e.clientX;
    const clickY = e.clientY;

    // 获取textarea中的光标位置
    const cursorPosition = textarea.selectionStart;

    // 查找点击位置对应的suggestion
    const clickedSuggestion = aiSuggestions.find((suggestion, index) => {
      return cursorPosition >= suggestion.start && cursorPosition <= suggestion.end;
    });

    if (clickedSuggestion) {
      const index = aiSuggestions.indexOf(clickedSuggestion);
      setSelectedSuggestionIndex(index);
      setRightPanelView('suggestions');

      // 显示popover在点击位置
      setPopoverPosition({
        x: clickX,
        y: clickY + 20
      });
      setShowPopover(true);
    } else {
      // 点击其他区域关闭popover
      setShowPopover(false);
    }
  };

  // 处理文本选择
  const handleTextSelection = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();

    if (selectedText.length > 0) {
      // 获取选中文本的上下文(所在句子)
      const fullText = textarea.value;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      // 找到句子的开始和结束
      let sentenceStart = selectionStart;
      let sentenceEnd = selectionEnd;

      // 向前查找句子开始(句号、问号、感叹号或文本开头)
      while (sentenceStart > 0 && !/[.!?\n]/.test(fullText[sentenceStart - 1])) {
        sentenceStart--;
      }

      // 向后查找句子结束(句号、问号、感叹号或文本结尾)
      while (sentenceEnd < fullText.length && !/[.!?\n]/.test(fullText[sentenceEnd])) {
        sentenceEnd++;
      }
      if (sentenceEnd < fullText.length) sentenceEnd++; // 包含句号

      const context = fullText.substring(sentenceStart, sentenceEnd).trim();

      // 使用鼠标位置来定位popup,显示在选中内容下方
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      setSelectionPopup({
        show: true,
        selectedText,
        context,
        position: {
          x: mouseX,
          y: mouseY + 10 // 在鼠标位置下方10px
        }
      });

      // 关闭suggestion popover
      setShowPopover(false);
    } else {
      // 如果没有选中文本,关闭popup
      setSelectionPopup({ show: false, selectedText: '', context: '', position: { x: 0, y: 0 } });
    }
  };

  // 处理selection popup的action
  const handleSelectionAction = (menuId: string) => {
    const { selectedText, context } = selectionPopup;

    // 查找对应的Menu卡片
    const menu = enabledMenus.find(m => m.id === menuId && m.enabled);
    if (!menu) {
      console.error('Menu not found:', menuId);
      return;
    }

    // 替换占位符
    let question = menu.promptTemplate
      .replace(/\{\{selectedText\}\}/g, selectedText)
      .replace(/\{\{context\}\}/g, context);

    // 如果Menu关联了Prompt卡片,添加Prompt上下文
    if (menu.promptCardIds && menu.promptCardIds.length > 0) {
      const relatedPrompts = prompts.filter(p => menu.promptCardIds!.includes(p.id));
      if (relatedPrompts.length > 0) {
        const promptContext = relatedPrompts.map(p =>
          `【Prompt: ${p.name}】\n描述: ${p.description}\n示例前: ${p.exampleBefore}\n示例后: ${p.exampleAfter}`
        ).join('\n\n');
        question = `${promptContext}\n\n${question}`;
      }
    }

    // 如果Menu关联了人物卡片,添加人物上下文
    if (menu.characterIds && menu.characterIds.length > 0) {
      const relatedCharacters = characters.filter(c => menu.characterIds!.includes(c.id));
      if (relatedCharacters.length > 0) {
        const characterContext = relatedCharacters.map(c =>
          `【人物: ${c.name}】\n描述: ${c.description}\n性格: ${c.personality}\n背景: ${c.background}`
        ).join('\n\n');
        question = `${characterContext}\n\n${question}`;
      }
    }

    // 发送到Agent Chat,并创建新的chat会话
    if (onAgentSendMessage) {
      onAgentSendMessage(question, menu.name);
      setRightPanelView('agent');
    }

    // 关闭popup
    setSelectionPopup({ show: false, selectedText: '', context: '', position: { x: 0, y: 0 } });
  };

  // ========== 引导写作相关方法 ==========

  // 开始引导写作
  const startGuidedWriting = (data: GuidedWritingData) => {
    setGuidedMode(true);
    setGuidedData(data);
    setCurrentStepContent('');
    setStepEvaluation(null);
    setText(''); // 清空编辑器
    setRightPanelView('suggestions'); // 切换到Suggestions视图
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    startGuidedWriting
  }));

  // 提交步骤评估
  const submitStepForEvaluation = async () => {
    if (!guidedData || !currentStepContent.trim()) return;

    setIsEvaluating(true);
    try {
      const response = await fetch('/api/evaluate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: guidedData.topic,
          stepName: guidedData.currentStep.name,
          content: currentStepContent,
          level: guidedData.level,
          apiToken,
          aiModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Evaluation failed');
      }

      const evaluation: StepEvaluation = await response.json();
      setStepEvaluation(evaluation);

      // 更新completedSteps
      const newStepResult: StepResult = {
        stepName: guidedData.currentStep.name,
        content: currentStepContent,
        score: evaluation.score,
        feedback: evaluation.feedback,
        nativeSuggestions: evaluation.nativeSuggestions,
      };

      setGuidedData({
        ...guidedData,
        completedSteps: [...guidedData.completedSteps, newStepResult],
      });

    } catch (error: any) {
      console.error('Failed to evaluate step:', error);
      alert(`Evaluation failed: ${error.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 查看反馈
  const viewFeedback = () => {
    if (!stepEvaluation) return;

    // 将nativeSuggestions显示在右侧AI Suggestions
    if (onUpdateAISuggestions) {
      onUpdateAISuggestions(stepEvaluation.nativeSuggestions);
    }

    // 切换到Suggestions视图(AI Suggestions tab)
    setRightPanelView('suggestions');
  };

  // 进入下一步
  const goToNextStep = async () => {
    if (!stepEvaluation || !guidedData) return;

    if (stepEvaluation.isComplete) {
      // 完成所有步骤
      alert('Congratulations! You have completed all writing steps!');
      setGuidedMode(false);
      return;
    }

    if (!stepEvaluation.nextStepName) return;

    // 获取下一步的指导内容
    try {
      // 这里我们直接从本地生成下一步,而不是调用API
      const stepSequence = ['introduction', 'body1', 'body2', 'body3', 'conclusion'];
      const nextIndex = stepSequence.indexOf(stepEvaluation.nextStepName);

      if (nextIndex === -1) return;

      // 从writing-agent-tools.ts复制的步骤指导数据
      const stepGuidance: Record<string, WritingStep> = {
        body1: {
          name: 'body1',
          displayName: 'Body Paragraph 1',
          instruction: 'Develop your first main point with supporting details and examples.',
          tips: [
            'Start with a clear topic sentence that introduces your main point',
            'Provide specific examples, facts, or evidence to support your point',
            'Explain how your examples relate to your thesis',
            'Use transition words to connect ideas smoothly',
          ],
        },
        body2: {
          name: 'body2',
          displayName: 'Body Paragraph 2',
          instruction: 'Present your second main point with evidence and analysis.',
          tips: [
            'Begin with a topic sentence for your second point',
            'Provide different examples or evidence than paragraph 1',
            'Show how this point connects to your overall argument',
            'Maintain logical flow from the previous paragraph',
          ],
        },
        body3: {
          name: 'body3',
          displayName: 'Body Paragraph 3',
          instruction: 'Develop your third main point or address counterarguments.',
          tips: [
            'Present your final main point or acknowledge opposing views',
            'Provide strong evidence to support your position',
            'If addressing counterarguments, explain why your view is stronger',
            'Prepare to transition to your conclusion',
          ],
        },
        conclusion: {
          name: 'conclusion',
          displayName: 'Conclusion',
          instruction: 'Summarize your main points and leave a lasting impression.',
          tips: [
            'Restate your thesis in different words',
            'Briefly summarize your main points (don\'t introduce new information)',
            'End with a thought-provoking statement or call to action',
            'Keep it concise and impactful',
          ],
        },
      };

      const nextStep = stepGuidance[stepEvaluation.nextStepName];
      if (!nextStep) return;

      setGuidedData({
        ...guidedData,
        currentStep: nextStep,
      });
      setCurrentStepContent('');
      setStepEvaluation(null);
      setText(''); // 清空编辑器

    } catch (error) {
      console.error('Failed to get next step:', error);
    }
  };

  // 点击外部关闭popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showPopover && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('error-highlight')) {
          setShowPopover(false);
        }
      }

      // 关闭selection popup
      if (selectionPopup.show && selectionPopupRef.current && !selectionPopupRef.current.contains(e.target as Node)) {
        setSelectionPopup({ show: false, selectedText: '', context: '', position: { x: 0, y: 0 } });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover, selectionPopup.show]);
  
  // ESC键关闭
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" 
        onClick={handleClose} 
      />
      
      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">开始写作</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Write and get instant grammar suggestions</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor (70%) */}
          <div className="w-full md:w-[70%] p-4 md:p-6 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* 引导模式: 题目和流程指示器 */}
            {guidedMode && guidedData && (
              <div className="mb-4 space-y-3">
                {/* 题目 */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Topic</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{guidedData.topic}</p>
                </div>

                {/* 流程指示器 */}
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowProgress(!showProgress)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${showProgress ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showProgress && (
                    <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
                      {['introduction', 'body1', 'body2', 'body3', 'conclusion'].map((stepName, index) => {
                        const stepDisplayNames: Record<string, string> = {
                          introduction: 'Introduction',
                          body1: 'Body Paragraph 1',
                          body2: 'Body Paragraph 2',
                          body3: 'Body Paragraph 3',
                          conclusion: 'Conclusion',
                        };
                        const completedStep = guidedData.completedSteps.find(s => s.stepName === stepName);
                        const isCurrent = guidedData.currentStep.name === stepName;
                        const isCompleted = !!completedStep;

                        return (
                          <div key={stepName} className="flex items-center gap-2">
                            {isCompleted ? (
                              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : isCurrent ? (
                              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" />
                              </svg>
                            )}
                            <span className={`text-sm ${isCurrent ? 'font-semibold text-blue-600 dark:text-blue-400' : isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                              {stepDisplayNames[stepName]}
                              {isCompleted && completedStep && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                  ({completedStep.score}/100)
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tips区域 (可折叠) */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Tips for {guidedData.currentStep.displayName}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${showTips ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showTips && (
                    <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {guidedData.currentStep.instruction}
                      </p>
                      <ul className="space-y-1">
                        {guidedData.currentStep.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 普通模式: 标题 */}
            {!guidedMode && (
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {showAnalysisResults ? 'Your Text' : 'Your Writing'}
                </label>
                <div className="flex items-center gap-2">
                  {novelContext && onGenerateDraft && (
                    <button
                      onClick={onGenerateDraft}
                      disabled={isGeneratingDraft}
                      className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          生成中...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          生成初稿
                        </>
                      )}
                    </button>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {text.length} characters
                  </span>
                </div>
              </div>
            )}

            {/* Overlay编辑器: textarea + 高亮层 */}
            <div className="flex-1 relative">
              {/* 底层: 高亮显示 */}
              <div
                ref={highlightRef}
                className="absolute inset-0 p-4 border border-gray-300 dark:border-gray-600 rounded-lg overflow-auto whitespace-pre-wrap break-words bg-white dark:bg-gray-900 text-gray-900 dark:text-white pointer-events-none"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: generateHighlightedHTML() }}
              />

              {/* 顶层: 透明textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  const newText = e.target.value;
                  setText(newText);
                  // 如果文本被清空,清除currentWritingId
                  if (newText.trim() === '' && onClearCurrentWriting) {
                    onClearCurrentWriting();
                  }
                }}
                onScroll={handleScroll}
                onClick={handleHighlightClick}
                onMouseUp={handleTextSelection}
                placeholder={showAnalysisResults ? "Edit your text..." : "Start writing here..."}
                className="absolute inset-0 p-4 border border-transparent rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 overflow-auto whitespace-pre-wrap break-words"
                style={{
                  color: showAnalysisResults && aiSuggestions.length > 0 ? 'transparent' : 'inherit',
                  caretColor: 'rgb(17, 24, 39)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  zIndex: 1
                }}
              />
            </div>
          </div>
          
          {/* Right: Analysis Results and Agent Chat (30%) */}
          <div className="hidden md:flex md:w-[30%] p-4 md:p-6 flex-col overflow-hidden">
            {/* 分析结果和Agent Chat切换 */}
              <>
                <div className="mb-4">
                  <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setRightPanelView('suggestions')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        rightPanelView === 'suggestions'
                          ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Suggestions ({aiSuggestions.length})
                    </button>
                    <button
                      onClick={() => setRightPanelView('agent')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        rightPanelView === 'agent'
                          ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Chat
                    </button>
                    {novelContext && onNovelContextChange && (
                      <button
                        onClick={() => setRightPanelView('novelContext')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          rightPanelView === 'novelContext'
                            ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Novel
                      </button>
                    )}
                    {onTimelineChange && (
                      <button
                        onClick={() => setRightPanelView('timeline')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          rightPanelView === 'timeline'
                            ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Timeline
                      </button>
                    )}
                  </div>
                </div>

                {/* 反馈模式内容 */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {rightPanelView === 'suggestions' ? (
                    /* Analysis界面 - 只显示AI suggestions */
                    <>
                      {isLoadingAISuggestions ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          Analyzing with AI...
                        </div>
                      ) : aiSuggestions.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No issues found</p>
                        </div>
                      ) : (
                        <>

                          {/* AI建议 */}
                          {aiSuggestions.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
                                AI Suggestions ({aiSuggestions.length})
                              </h3>
                              {aiSuggestions.map((suggestion, index) => (
                                <div
                                  key={`ai-${index}`}
                                  className={`p-3 rounded-lg border mb-2 transition-all ${
                                    selectedSuggestionIndex === index
                                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400'
                                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                                      AI · {suggestion.type}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Line {text.substring(0, suggestion.start).split('\n').length}
                                    </span>
                                    {selectedSuggestionIndex === index && (
                                      <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        ← Selected
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    "{suggestion.problemText}"
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    {suggestion.message}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {suggestion.replacements.map((replacement, repIndex) => (
                                      <button
                                        key={repIndex}
                                        onClick={() => applyAISuggestion(suggestion, replacement)}
                                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                      >
                                        {replacement}
                                      </button>
                                    ))}
                                    {suggestion.type === 'Error' ? (
                                      <button
                                        onClick={() => {
                                          if (onOpenSettings) {
                                            onOpenSettings();
                                          }
                                        }}
                                        className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Open Settings
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          const question = `Please explain this AI suggestion in detail:\n\nOriginal text: "${suggestion.problemText}"\nIssue type: ${suggestion.type}\nMessage: ${suggestion.message}\nSuggested replacements: ${suggestion.replacements.join(', ')}\n\nWhy is this change recommended?`;
                                          if (onAgentSendMessage) {
                                            onAgentSendMessage(question, 'explain-ai');
                                            setRightPanelView('agent');
                                          }
                                        }}
                                        className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Ask AI
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : rightPanelView === 'agent' ? (
                    /* Agent Chat界面 */
                    <>
                      <div className="space-y-3 mb-4">
                        {agentMessages.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Continue the conversation
                          </div>
                        ) : (
                          <>
                            {agentMessages.map((msg, idx) => (
                              <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-50 dark:bg-emerald-900/20 ml-4' : 'bg-gray-100 dark:bg-gray-700 mr-4'}`}>
                                {msg.role === 'user' ? (
                                  <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {msg.content}
                                  </div>
                                ) : (
                                  <div className="text-sm">
                                    <MarkdownContent content={msg.content} />
                                  </div>
                                )}
                              </div>
                            ))}
                            {/* Loading状态 - 只在没有AI回复或最后一条是用户消息时显示 */}
                            {isAgentLoading && (agentMessages.length === 0 || agentMessages[agentMessages.length - 1]?.role === 'user') && (
                              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                  </div>
                                  <span>Thinking...</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div ref={agentMessagesEndRef} />
                      </div>

                      {/* Agent输入框 */}
                      <div className="flex gap-2 sticky bottom-0 bg-white dark:bg-gray-800 pt-2">
                        <button
                          onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Chat History"
                        >
                          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <input
                          type="text"
                          value={agentInput}
                          onChange={(e) => setAgentInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAgentSend()}
                          placeholder="Ask a question..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          disabled={isAgentLoading}
                        />
                        <button
                          onClick={handleAgentSend}
                          disabled={!agentInput.trim() || isAgentLoading}
                          className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : rightPanelView === 'novelContext' && novelContext && onNovelContextChange ? (
                    /* Novel Context界面 */
                    <NovelContextPanel
                      context={novelContext}
                      onChange={onNovelContextChange}
                      timeline={timeline}
                      onTimelineChange={onTimelineChange}
                    />
                  ) : rightPanelView === 'timeline' && onTimelineChange ? (
                    /* Timeline界面 */
                    <TimelinePanel
                      timeline={timeline}
                      onChange={onTimelineChange}
                      onGenerateContent={onGenerateTimelineContent}
                      generatingItemId={generatingTimelineItemId}
                      candidateVersions={candidateVersions}
                      onApplyVersion={onApplyVersion}
                      onClearCandidates={onClearCandidates}
                      onJumpToContent={onJumpToTimelineContent}
                    />
                  ) : null}
                </div>
              </>
          </div>
        </div>

        {/* Popover for suggestion details */}
        {showPopover && selectedSuggestionIndex !== null && aiSuggestions[selectedSuggestionIndex] && popoverPosition && (
          <div
            ref={popoverRef}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-md"
            style={{
              left: `${popoverPosition.x}px`,
              top: `${popoverPosition.y}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {(() => {
              const suggestion = aiSuggestions[selectedSuggestionIndex];
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                      AI · {suggestion.type}
                    </span>
                    <button
                      onClick={() => setShowPopover(false)}
                      className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    "{suggestion.problemText}"
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {suggestion.message}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Suggestions:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.replacements.map((replacement, repIndex) => (
                        <button
                          key={repIndex}
                          onClick={() => {
                            applyAISuggestion(suggestion, replacement);
                            setShowPopover(false);
                          }}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                        >
                          {replacement}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const question = `Please explain this AI suggestion in detail:\n\nOriginal text: "${suggestion.problemText}"\nIssue type: ${suggestion.type}\nMessage: ${suggestion.message}\nSuggested replacements: ${suggestion.replacements.join(', ')}\n\nWhy is this change recommended?`;
                        if (onAgentSendMessage) {
                          onAgentSendMessage(question, 'explain-ai');
                          setRightPanelView('agent');
                          setShowPopover(false);
                        }
                      }}
                      className="w-full mt-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Ask AI for Explanation
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Selection Popup */}
        {selectionPopup.show && (
          <div
            ref={selectionPopupRef}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2"
            style={{
              left: `${selectionPopup.position.x}px`,
              top: `${selectionPopup.position.y}px`,
            }}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2 pt-1">
              "{selectionPopup.selectedText}"
            </div>
            <div className="flex flex-col gap-1">
              {enabledMenus.filter(m => m.enabled).sort((a, b) => a.order - b.order).map(menu => (
                <button
                  key={menu.id}
                  onClick={() => handleSelectionAction(menu.id)}
                  className="px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
                  title={menu.description}
                >
                  {menu.name}
                </button>
              ))}
              {enabledMenus.filter(m => m.enabled).length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  暂无可用菜单项,请在Menu管理页面创建
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          {guidedMode ? (
            /* 引导模式Footer */
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  关闭
                </button>
                {/* Save按钮 - 保存所有已完成步骤的内容 */}
                <button
                  onClick={() => {
                    if (!guidedData || !onSaveWritingHistory) return;

                    // 组合所有已完成步骤的内容,包含详细信息
                    let fullEssay = `# Essay Writing Record\n\n`;
                    fullEssay += `**Topic**: ${guidedData.topic}\n`;
                    fullEssay += `**Level**: ${guidedData.level}\n\n`;
                    fullEssay += `---\n\n`;

                    // 保存已完成的步骤
                    guidedData.completedSteps.forEach((step) => {
                      const stepDisplayNames: Record<string, string> = {
                        introduction: 'Introduction',
                        body1: 'Body Paragraph 1',
                        body2: 'Body Paragraph 2',
                        body3: 'Body Paragraph 3',
                        conclusion: 'Conclusion',
                      };

                      fullEssay += `## ${stepDisplayNames[step.stepName]} (Score: ${step.score}/100)\n\n`;
                      fullEssay += `### Content\n${step.content}\n\n`;

                      if (step.feedback) {
                        fullEssay += `### Feedback\n${step.feedback}\n\n`;
                      }

                      if (step.nativeSuggestions && step.nativeSuggestions.length > 0) {
                        fullEssay += `### Native Expression Suggestions\n`;
                        step.nativeSuggestions.forEach((suggestion, idx) => {
                          fullEssay += `${idx + 1}. **${suggestion.original}** → **${suggestion.suggestion}**\n`;
                          fullEssay += `   - ${suggestion.explanation}\n`;
                        });
                        fullEssay += `\n`;
                      }

                      fullEssay += `---\n\n`;
                    });

                    // 如果当前步骤有内容但未评估,也包含进去
                    if (currentStepContent.trim() && !stepEvaluation) {
                      const stepDisplayNames: Record<string, string> = {
                        introduction: 'Introduction',
                        body1: 'Body Paragraph 1',
                        body2: 'Body Paragraph 2',
                        body3: 'Body Paragraph 3',
                        conclusion: 'Conclusion',
                      };

                      fullEssay += `## ${stepDisplayNames[guidedData.currentStep.name]} (In Progress)\n\n`;
                      fullEssay += `### Instruction\n${guidedData.currentStep.instruction}\n\n`;

                      if (guidedData.currentStep.tips && guidedData.currentStep.tips.length > 0) {
                        fullEssay += `### Tips\n`;
                        guidedData.currentStep.tips.forEach((tip) => {
                          fullEssay += `- ${tip}\n`;
                        });
                        fullEssay += `\n`;
                      }

                      fullEssay += `### Content\n${currentStepContent}\n\n`;
                    }

                    onSaveWritingHistory(fullEssay);
                  }}
                  disabled={!guidedData || (guidedData.completedSteps.length === 0 && !currentStepContent.trim())}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save Essay"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {stepEvaluation ? (
                  /* 评估后显示的按钮 */
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Score:
                      </span>
                      <span className={`text-lg font-bold ${
                        stepEvaluation.score >= 80 ? 'text-green-600 dark:text-green-400' :
                        stepEvaluation.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {stepEvaluation.score}/100
                      </span>
                    </div>
                    {stepEvaluation.nativeSuggestions.length > 0 && (
                      <button
                        onClick={viewFeedback}
                        className="px-4 py-2 border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Feedback ({stepEvaluation.nativeSuggestions.length})
                      </button>
                    )}
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {stepEvaluation.isComplete ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Complete
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Next Step
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* 评估前显示的按钮 */
                  <button
                    onClick={submitStepForEvaluation}
                    disabled={!currentStepContent.trim() || isEvaluating}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isEvaluating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit for Evaluation
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* 普通模式Footer */
            <>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span>{text.length} characters</span>
              </div>
              <div className="flex gap-3">
                {/* 历史记录按钮 */}
                <button
                  onClick={() => setShowWritingHistorySidebar(!showWritingHistorySidebar)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Writing History"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
                {/* 保存按钮 */}
                <button
                  onClick={() => {
                    if (text.trim() && onSaveWritingHistory) {
                      onSaveWritingHistory(text);
                    }
                  }}
                  disabled={!text.trim()}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {showAnalysisResults ? '重新分析' : '提交分析'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 历史记录侧边栏 */}
      {showHistorySidebar && (
        <div
          ref={historySidebarRef}
          className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-10 flex flex-col animate-in slide-in-from-right duration-200"
        >
          {/* 侧边栏标题 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat History</h3>
            <button
              onClick={() => setShowHistorySidebar(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 历史记录列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {chatSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                No chat history yet
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="relative group p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-emerald-500 dark:hover:border-emerald-400"
                  >
                    <button
                      onClick={() => {
                        if (onSelectChatSession) {
                          onSelectChatSession(session.id);
                          setShowHistorySidebar(false);
                        }
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate mb-1 pr-8">
                        {session.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{session.messages.length} messages</span>
                        <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                      {session.actionType && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded">
                            {session.actionType}
                          </span>
                        </div>
                      )}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteChatSession) {
                          onDeleteChatSession(session.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 写作历史记录侧边栏 */}
      {showWritingHistorySidebar && (
        <div
          ref={writingHistorySidebarRef}
          className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-10 flex flex-col animate-in slide-in-from-left duration-200"
        >
          {/* 侧边栏标题 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Writing History</h3>
            <button
              onClick={() => setShowWritingHistorySidebar(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 历史记录列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {writingHistories.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                No writing history yet
              </div>
            ) : (
              <div className="space-y-2">
                {writingHistories.map((history) => (
                  <div
                    key={history.id}
                    className="relative group p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-emerald-500 dark:hover:border-emerald-400"
                  >
                    <button
                      onClick={() => {
                        if (onLoadWritingHistory) {
                          const content = onLoadWritingHistory(history.id);
                          if (content) {
                            setText(content);
                            setShowWritingHistorySidebar(false);
                          }
                        }
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate mb-1 pr-8">
                        {history.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{history.content.length} characters</span>
                        <span>{new Date(history.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteWritingHistory) {
                          onDeleteWritingHistory(history.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      title="Delete writing"
                    >
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

WritingModal.displayName = 'WritingModal';
