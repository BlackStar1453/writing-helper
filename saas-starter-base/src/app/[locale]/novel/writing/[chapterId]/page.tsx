/**
 * 章节写作页面
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NovelNav } from '@/components/novel/NovelNav';
import { WritingModal } from '@/components/WritingModal';
import { useChapters } from '@/lib/novel/hooks/use-chapters';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useLocations } from '@/lib/novel/hooks/use-locations';
import { useSettings } from '@/lib/novel/hooks/use-settings';
import { useEvents } from '@/lib/novel/hooks/use-events';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { NovelContext, Chapter, ChapterTimelineItem, ChapterVersion } from '@/lib/novel/types';
import { getSettings } from '@/lib/db-utils';
import { GenerateDraftSettingsModal, GenerateDraftSettings } from '@/components/novel/GenerateDraftSettingsModal';
import { toast } from 'sonner';

export default function ChapterWritingPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;

  const { currentNovelId } = useNovels();
  const { chapters, getChapterById, updateChapter } = useChapters(currentNovelId);
  const { characters } = useCharacters(currentNovelId);
  const { locations } = useLocations(currentNovelId);
  const { settings } = useSettings(currentNovelId);
  const { events } = useEvents(currentNovelId);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [novelContext, setNovelContext] = useState<NovelContext>({});
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);

  // 版本控制状态
  const [chapterVersions, setChapterVersions] = useState<ChapterVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  // 加载章节数据
  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  // 加载完成后自动打开WritingModal
  useEffect(() => {
    if (!loading && chapter) {
      setIsWritingModalOpen(true);
    }
  }, [loading, chapter]);

  const loadChapter = async () => {
    try {
      setLoading(true);
      const data = await getChapterById(chapterId);
      
      if (!data) {
        // 章节不存在，返回章节列表
        router.push('/novel/chapters');
        return;
      }

      setChapter(data);

      // 加载版本历史
      setChapterVersions(data.versions || []);
      setCurrentVersion(data.currentVersion || 1);

      // 初始化NovelContext
      const selectedChars = characters.filter(c => data.selectedCharacters?.includes(c.id));
      const selectedLocs = locations.filter(l => data.selectedLocations?.includes(l.id));

      setNovelContext({
        novelId: currentNovelId || undefined,
        chapterInfo: {
          volume: data.volumeId,
          chapter: data.chapterId,
          section: data.sectionId,
          title: data.title,
        },
        selectedCharacters: selectedChars,
        selectedLocations: selectedLocs,
        plotSummary: data.plotSummary || '',
        chapterPrompt: data.chapterPrompt || '',
        globalPrompt: '', // TODO: 从设置中加载
      });
    } catch (err) {
      console.error('Failed to load chapter:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理NovelContext变化
  const handleNovelContextChange = (context: NovelContext) => {
    setNovelContext(context);
  };

  // 打开生成设置Modal
  const handleGenerateDraft = () => {
    setIsSettingsModalOpen(true);
  };

  // 生成Timeline
  const handleGenerateTimeline = async (settings: GenerateDraftSettings): Promise<ChapterTimelineItem[]> => {
    try {
      setIsGeneratingTimeline(true);

      // 获取API设置
      const apiSettings = await getSettings();

      // 检查API Token
      if (!apiSettings.apiToken) {
        toast.error('请先在设置中配置API Token');
        return [];
      }

      // 构建请求数据
      const requestData = {
        context: {
          chapterInfo: novelContext.chapterInfo,
          selectedCharacters: settings.selectedCharacters,
          selectedLocations: settings.selectedLocations,
          selectedSettings: settings.selectedSettings,
          plotSummary: settings.plotSummary,
          globalPrompt: settings.globalPrompt,
          chapterPrompt: settings.chapterPrompt,
          referenceChapters: settings.referenceChapters,
        },
        apiToken: apiSettings.apiToken,
        model: apiSettings.aiModel,
      };

      // 调用API生成Timeline
      const response = await fetch('/api/novel/generate-timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate timeline');
      }

      const data = await response.json();
      toast.success('Timeline生成成功');
      return data.timeline || [];
    } catch (err) {
      console.error('Failed to generate timeline:', err);
      toast.error('生成Timeline失败: ' + (err instanceof Error ? err.message : '未知错误'));
      return [];
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  // 确认生成初稿
  const handleConfirmGenerate = async (settings: GenerateDraftSettings, timeline: ChapterTimelineItem[], customPrompt?: string) => {
    try {
      setIsGeneratingDraft(true);

      // 获取API设置
      const apiSettings = await getSettings();

      // 检查API Token
      if (!apiSettings || !apiSettings.apiToken) {
        toast.error('请先在设置中配置API Token');
        return;
      }

      // 构建请求数据 - 使用context对象包装
      const requestData: any = {
        context: {
          chapterInfo: novelContext.chapterInfo,
          selectedCharacters: settings.selectedCharacters,
          selectedLocations: settings.selectedLocations,
          selectedSettings: settings.selectedSettings,
          selectedEvents: settings.selectedEvents, // 添加事件卡片
          selectedPrompts: settings.selectedPrompts, // 添加Prompt卡片
          plotSummary: settings.plotSummary,
          globalPrompt: settings.globalPrompt,
          chapterPrompt: settings.chapterPrompt,
          referenceChapters: settings.referenceChapters, // 添加参考章节
          timeline: timeline, // 使用Modal中的timeline
        },
        apiToken: apiSettings.apiToken,
        model: apiSettings.aiModel,
      };

      // 如果有自定义prompt,则添加到请求数据中
      if (customPrompt) {
        requestData.customPrompt = customPrompt;
      }

      // 调用API生成初稿
      const response = await fetch('/api/novel/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate draft');
      }

      const data = await response.json();

      // 更新章节内容和时间线
      if (chapter) {
        const updateData: any = {
          content: data.content,
          selectedCharacters: settings.selectedCharacters?.map(c => c.id),
          selectedLocations: settings.selectedLocations?.map(l => l.id),
          plotSummary: settings.plotSummary,
          chapterPrompt: settings.chapterPrompt,
          timeline: timeline, // 保存Modal中的timeline
        };

        await updateChapter(chapter.id, updateData);

        // 重新加载章节
        await loadChapter();

        // 自动创建版本1（如果是第一次生成初稿）
        if (chapterVersions.length === 0) {
          const version1: ChapterVersion = {
            id: `version-${Date.now()}`,
            chapterId: chapter.id,
            version: 1,
            content: data.content,
            timeline: timeline,
            createdAt: new Date(),
            description: '初稿',
          };

          await updateChapter(chapter.id, {
            versions: [version1],
            currentVersion: 1,
          });

          setChapterVersions([version1]);
          setCurrentVersion(1);

          toast.success('初稿生成成功！已自动保存为版本 1');
        } else {
          toast.success('初稿生成成功！');
        }
      }
    } catch (err) {
      console.error('Failed to generate draft:', err);
      toast.error('生成初稿失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // 处理时间线变化
  const handleTimelineChange = async (timeline: ChapterTimelineItem[]) => {
    try {
      if (!chapter) return;

      // 保存时间线到章节
      await updateChapter(chapter.id, {
        timeline,
      });

      // 更新本地状态
      setChapter({
        ...chapter,
        timeline,
      });
    } catch (err) {
      console.error('Failed to save timeline:', err);
    }
  };


  // 处理写作内容提交
  const handleWritingSubmit = async (data: { text: string }) => {
    try {
      if (!chapter) return;

      // 注意: 用户手动编辑后,Timeline标记会丢失
      // 这是预期行为,因为手动编辑的内容可能不再对应原timeline节点
      // 如果需要重新生成,可以再次点击timeline节点的生成按钮

      // 保存章节内容
      await updateChapter(chapter.id, {
        content: data.text,
        selectedCharacters: novelContext.selectedCharacters?.map(c => c.id),
        selectedLocations: novelContext.selectedLocations?.map(l => l.id),
        plotSummary: novelContext.plotSummary,
        chapterPrompt: novelContext.chapterPrompt,
      });

      // 立即同步到本地状态，避免重新打开显示旧内容
      setChapter({
        ...chapter,
        content: data.text,
      });

      toast.success('保存成功！');
    } catch (err) {
      console.error('Failed to save chapter:', err);
      toast.error('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 跳转到Timeline节点对应的内容位置
  const handleJumpToTimelineContent = (timelineItemId: string) => {
    // 触发自定义事件,让WritingModal处理滚动
    const event = new CustomEvent('jump-to-timeline-content', {
      detail: { timelineItemId }
    });
    window.dispatchEvent(event);
  };

  // 保存新版本
  const handleSaveVersion = async (description?: string) => {
    try {
      if (!chapter) return;

      const nextVersion = currentVersion + 1;

      // 从数据源获取最新内容，避免使用可能过期的本地 chapter.state
      const latest = await getChapterById(chapter.id);
      const contentForVersion = latest?.content ?? chapter.content;
      const timelineForVersion = latest?.timeline ?? (chapter.timeline || []);

      // 创建新版本（使用最新内容）
      const newVersion: ChapterVersion = {
        id: `version-${Date.now()}`,
        chapterId: chapter.id,
        version: nextVersion,
        content: contentForVersion,
        timeline: timelineForVersion,
        createdAt: new Date(),
        description: description || `第${nextVersion}次修改`,
      };

      // 添加新版本到列表
      const updatedVersions = [...chapterVersions, newVersion];

      // 限制版本数量为10个
      if (updatedVersions.length > 10) {
        updatedVersions.shift(); // 删除最旧的版本
      }

      // 更新章节
      await updateChapter(chapter.id, {
        versions: updatedVersions,
        currentVersion: nextVersion,
      });

      // 更新本地状态
      setChapterVersions(updatedVersions);
      setCurrentVersion(nextVersion);

      toast.success(`版本 ${nextVersion} 保存成功！`);
    } catch (err) {
      console.error('Failed to save version:', err);
      toast.error('保存版本失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 加载指定版本
  const handleLoadVersion = async (version: number) => {
    try {
      if (!chapter) return;

      const targetVersion = chapterVersions.find(v => v.version === version);
      if (!targetVersion) {
        toast.error('版本不存在');
        return;
      }

      // 更新章节内容和timeline
      await updateChapter(chapter.id, {
        content: targetVersion.content,
        timeline: targetVersion.timeline,
        currentVersion: version,
      });

      // 更新本地状态
      setCurrentVersion(version);

      // 重新加载章节
      await loadChapter();

      toast.success(`已切换到版本 ${version}`);
    } catch (err) {
      console.error('Failed to load version:', err);
      toast.error('加载版本失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: string) => {
    try {
      if (!chapter) return;

      const updatedVersions = chapterVersions.filter(v => v.id !== versionId);

      // 更新章节
      await updateChapter(chapter.id, {
        versions: updatedVersions,
      });

      // 更新本地状态
      setChapterVersions(updatedVersions);

      toast.success('版本删除成功！');
    } catch (err) {
      console.error('Failed to delete version:', err);
      toast.error('删除版本失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  if (loading) {
    return (
      <NovelNav>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </NovelNav>
    );
  }

  if (!chapter) {
    return null;
  }

  return (
    <NovelNav>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{chapter.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {chapter.volumeId} &gt; {chapter.chapterId} &gt; {chapter.sectionId}
          </p>
        </div>

        <button
          onClick={() => {
            // 打开WritingModal
            const modal = document.getElementById('writing-modal-trigger');
            if (modal) {
              (modal as HTMLButtonElement).click();
            }
          }}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          开始写作
        </button>

        {/* Hidden trigger for WritingModal */}
        <button
          id="writing-modal-trigger"
          style={{ display: 'none' }}
          onClick={() => {
            const event = new CustomEvent('open-writing-modal');
            window.dispatchEvent(event);
          }}
        />

        {/* WritingModal */}
        <WritingModalWrapper
          chapter={chapter}
          novelContext={novelContext}
          onNovelContextChange={handleNovelContextChange}
          onGenerateDraft={handleGenerateDraft}
          isGeneratingDraft={isGeneratingDraft}
          onSubmit={handleWritingSubmit}
          onTimelineChange={handleTimelineChange}
          onJumpToTimelineContent={handleJumpToTimelineContent}
          isOpen={isWritingModalOpen}
          onOpenChange={setIsWritingModalOpen}
          chapterVersions={chapterVersions}
          currentVersion={currentVersion}
          onSaveVersion={handleSaveVersion}
          onLoadVersion={handleLoadVersion}
          onDeleteVersion={handleDeleteVersion}
          allCharacters={characters}
          allLocations={locations}
          allSettings={settings}
        />

        {/* 生成初稿设置Modal */}
        <GenerateDraftSettingsModal
          open={isSettingsModalOpen}
          onOpenChange={setIsSettingsModalOpen}
          allChapters={chapters}
          allCharacters={characters}
          allLocations={locations}
          allSettings={settings}
          allEvents={events}
          currentChapterId={chapterId}
          initialSettings={{
            selectedCharacters: novelContext.selectedCharacters,
            selectedLocations: novelContext.selectedLocations,
            selectedSettings: novelContext.selectedSettings,
            selectedEvents: novelContext.selectedEvents,
            plotSummary: novelContext.plotSummary || '',
            chapterPrompt: novelContext.chapterPrompt || '',
            globalPrompt: novelContext.globalPrompt || '',
          }}
          onConfirm={handleConfirmGenerate}
          onGenerateTimeline={handleGenerateTimeline}
          isGeneratingTimeline={isGeneratingTimeline}
          initialTimeline={chapter?.timeline || []}
        />
      </div>
    </NovelNav>
  );
}

// WritingModal包装组件
function WritingModalWrapper({
  chapter,
  novelContext,
  onNovelContextChange,
  onGenerateDraft,
  isGeneratingDraft,
  onSubmit,
  onTimelineChange,
  onJumpToTimelineContent,
  isOpen,
  onOpenChange,
  chapterVersions,
  currentVersion,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  allCharacters,
  allLocations,
  allSettings,
}: {
  chapter: Chapter;
  novelContext: NovelContext;
  onNovelContextChange: (context: NovelContext) => void;
  onGenerateDraft: () => void;
  isGeneratingDraft: boolean;
  onSubmit: (data: { text: string }) => Promise<void>;
  onTimelineChange: (timeline: ChapterTimelineItem[]) => void;
  onJumpToTimelineContent: (timelineItemId: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chapterVersions: ChapterVersion[];
  currentVersion: number;
  onSaveVersion: (description?: string) => void;
  onLoadVersion: (version: number) => void;
  onDeleteVersion: (versionId: string) => void;
  allCharacters: any[];
  allLocations: any[];
  allSettings: any[];
}) {
  const [text, setText] = useState(chapter.content || '');
  const [initialContent, setInitialContent] = useState(chapter.content || '');

  // 自动保存相关引用
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTextRef = useRef<string>(chapter.content || '');

  // 当chapter.content变化时更新text状态、初始内容及基线
  useEffect(() => {
    setText(chapter.content || '');
    setInitialContent(chapter.content || '');
    lastSavedTextRef.current = chapter.content || '';
  }, [chapter.content]);

  useEffect(() => {
    const handleOpen = () => onOpenChange(true);
    window.addEventListener('open-writing-modal', handleOpen);
    return () => window.removeEventListener('open-writing-modal', handleOpen);
  }, [onOpenChange]);

  // 根据字数变化进行有条件自动保存（防抖）
  useEffect(() => {
    if (!isOpen) return;

    // 仅在字数变动时触发自动保存
    if (text.length === lastSavedTextRef.current.length) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await onSubmit({ text });
        // 同步基线，避免重复保存
        lastSavedTextRef.current = text;
        setInitialContent(text);
      } catch (e) {
        console.error('Auto save (chapter) failed:', e);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [text, isOpen, onSubmit]);

  // 关闭时自动保存（等待完成）
  const handleClose = async () => {
    // 保存当前内容
    await onSubmit({ text });
    setInitialContent(text);

    // 检查内容是否有变化
    const hasContentChanged = text !== initialContent;

    // 如果内容有变化且已有版本历史，自动保存新版本
    if (hasContentChanged && chapterVersions.length > 0) {
      // 自动生成版本描述
      const autoDescription = `第${currentVersion + 1}次修改`;
      onSaveVersionProxy(autoDescription);
    }

    // 关闭modal
    onOpenChange(false);
  };

  // 保存版本前优先保存当前编辑内容
  const onSaveVersionProxy = async (description?: string) => {
    await onSubmit({ text });
    setInitialContent(text);
    onSaveVersion(description);
  };

  // 传递原始内容(带标记),WritingModal内部会进行清理
  return (
    <WritingModal
      isOpen={isOpen}
      onClose={handleClose}
      onTextChange={setText}
      initialText={chapter.content || ''}
      novelContext={novelContext}
      onNovelContextChange={onNovelContextChange}
      onGenerateDraft={onGenerateDraft}
      isGeneratingDraft={isGeneratingDraft}
      timeline={chapter.timeline || []}
      onTimelineChange={onTimelineChange}
      onJumpToTimelineContent={onJumpToTimelineContent}
      chapterVersions={chapterVersions}
      currentVersion={currentVersion}
      onSaveVersion={onSaveVersionProxy}
      onLoadVersion={onLoadVersion}
      onDeleteVersion={onDeleteVersion}
      allCharacters={allCharacters}
      allLocations={allLocations}
      allSettings={allSettings}
    />
  );
}

