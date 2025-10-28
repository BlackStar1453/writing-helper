/**
 * 章节写作页面
 */

'use client';

import { useState, useEffect } from 'react';
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
import { GenerateTimelineContentModal } from '@/components/novel/GenerateTimelineContentModal';
import { insertContentAtTimelinePosition } from '@/lib/novel/content-utils';
import { CandidateVersions, ContentVersion } from '@/components/novel/TimelinePanel';
import { toast } from 'sonner';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';

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
  const { prompts } = usePrompts(currentNovelId);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [novelContext, setNovelContext] = useState<NovelContext>({});
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [generatingTimelineItemId, setGeneratingTimelineItemId] = useState<string | null>(null);
  const [candidateVersions, setCandidateVersions] = useState<CandidateVersions | null>(null);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [isTimelineContentModalOpen, setIsTimelineContentModalOpen] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<ChapterTimelineItem | null>(null);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number>(-1);

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
  const handleConfirmGenerate = async (settings: GenerateDraftSettings, timeline: ChapterTimelineItem[]) => {
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
      const requestData = {
        context: {
          chapterInfo: novelContext.chapterInfo,
          selectedCharacters: settings.selectedCharacters,
          selectedLocations: settings.selectedLocations,
          selectedSettings: settings.selectedSettings,
          plotSummary: settings.plotSummary,
          globalPrompt: settings.globalPrompt,
          chapterPrompt: settings.chapterPrompt,
          referenceChapters: settings.referenceChapters, // 添加参考章节
          timeline: timeline, // 使用Modal中的timeline
        },
        apiToken: apiSettings.apiToken,
        model: apiSettings.aiModel,
      };

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

  // 为Timeline节点生成对应的内容 - 打开配置Modal
  const handleGenerateTimelineContent = (timelineItem: ChapterTimelineItem, index: number) => {
    setSelectedTimelineItem(timelineItem);
    setSelectedTimelineIndex(index);
    setIsTimelineContentModalOpen(true);
  };

  // 确认生成Timeline节点内容
  const handleConfirmGenerateTimelineContent = async (genSettings: {
    selectedCharacterIds: string[];
    selectedLocationIds: string[];
    selectedPromptIds: string[];
    selectedSettingIds: string[];
    selectedEventIds: string[];
  }) => {
    try {
      if (!chapter || !selectedTimelineItem) return;

      setIsTimelineContentModalOpen(false);
      setGeneratingTimelineItemId(selectedTimelineItem.id);

      // 获取API设置
      const apiSettings = await getSettings();

      // 检查API Token
      if (!apiSettings.apiToken) {
        toast.error('请先在设置中配置API Token');
        return;
      }

      // 构建上下文
      const selectedCharacters = characters.filter(c => genSettings.selectedCharacterIds.includes(c.id));
      const selectedLocations = locations.filter(l => genSettings.selectedLocationIds.includes(l.id));
      const selectedPrompts = prompts.filter(p => genSettings.selectedPromptIds.includes(p.id));
      const selectedSettings = settings.filter(s => genSettings.selectedSettingIds.includes(s.id));
      const selectedEvents = events.filter(e => genSettings.selectedEventIds.includes(e.id));

      const context = {
        ...novelContext,
        selectedCharacters,
        selectedLocations,
        selectedPrompts,
        selectedSettings,
        selectedEvents,
      };

      // 构建请求数据
      const requestData = {
        currentContent: chapter.content || '',
        timeline: chapter.timeline || [],
        targetItem: selectedTimelineItem,
        targetIndex: selectedTimelineIndex,
        chapterInfo: context.chapterInfo,
        context,
        apiToken: apiSettings.apiToken,
        model: apiSettings.aiModel,
      };

      // 调用API生成内容
      const response = await fetch('/api/novel/generate-timeline-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate timeline content');
      }

      const data = await response.json();

      // 保存候选版本供用户选择
      setCandidateVersions({
        timelineItemId: data.timelineItemId,
        versions: data.versions,
      });

      // 不再自动插入,等待用户选择
    } catch (err) {
      console.error('Failed to generate timeline content:', err);
      toast.error('生成内容失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setGeneratingTimelineItemId(null);
    }
  };

  // 重新生成Timeline节点内容（基于修改建议）
  const handleRegenerateTimelineContent = async (timelineItem: ChapterTimelineItem, index: number, currentContent?: string) => {
    try {
      if (!chapter) return;

      setGeneratingTimelineItemId(timelineItem.id);

      // 获取API设置
      const apiSettings = await getSettings();
      if (!apiSettings.apiToken) {
        toast.error('请先在设置中配置 API Token');
        return;
      }

      // 使用当前的novelContext（包含已选择的人物、地点等）
      const context = {
        ...novelContext,
      };

      // 构建请求数据
      // 优先使用传入的currentContent(编辑器中的最新内容),否则使用chapter.content
      const requestData = {
        currentContent: currentContent || chapter.content || '',
        timeline: chapter.timeline || [],
        targetItem: timelineItem,
        targetIndex: index,
        chapterInfo: context.chapterInfo,
        context,
        apiToken: apiSettings.apiToken,
        model: apiSettings.aiModel,
      };

      // 调用API重新生成内容
      const response = await fetch('/api/novel/regenerate-timeline-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate timeline content');
      }

      const data = await response.json();

      // 保存候选版本供用户选择
      setCandidateVersions({
        timelineItemId: data.timelineItemId,
        versions: data.versions,
      });

      toast.success('已生成3个候选版本，请选择一个应用');
    } catch (err) {
      console.error('Failed to regenerate timeline content:', err);
      toast.error('重新生成内容失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setGeneratingTimelineItemId(null);
    }
  };

  // 应用选中的版本
  const handleApplyVersion = async (version: ContentVersion) => {
    try {
      if (!chapter || !candidateVersions) return;

      // 使用智能插入逻辑,将内容插入到正确位置
      const targetIndex = chapter.timeline?.findIndex(
        item => item.id === candidateVersions.timelineItemId
      ) ?? -1;

      if (targetIndex === -1) {
        throw new Error('Timeline item not found');
      }

      const newContent = insertContentAtTimelinePosition(
        chapter.content || '',
        version.content,
        candidateVersions.timelineItemId,
        targetIndex,
        chapter.timeline || []
      );

      await updateChapter(chapter.id, {
        content: newContent,
      });

      // 清空候选版本
      setCandidateVersions(null);

      // 重新加载章节
      await loadChapter();

      toast.success('内容应用成功！');
    } catch (err) {
      console.error('Failed to apply version:', err);
      toast.error('应用失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 清空候选版本
  const handleClearCandidates = () => {
    setCandidateVersions(null);
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

      // 创建新版本
      const newVersion: ChapterVersion = {
        id: `version-${Date.now()}`,
        chapterId: chapter.id,
        version: nextVersion,
        content: chapter.content,
        timeline: chapter.timeline || [],
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
          onGenerateTimelineContent={handleGenerateTimelineContent}
          generatingTimelineItemId={generatingTimelineItemId}
          candidateVersions={candidateVersions}
          onApplyVersion={handleApplyVersion}
          onClearCandidates={handleClearCandidates}
          onJumpToTimelineContent={handleJumpToTimelineContent}
          onRegenerateTimelineContent={handleRegenerateTimelineContent}
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

        {/* 生成Timeline节点内容设置Modal */}
        <GenerateTimelineContentModal
          isOpen={isTimelineContentModalOpen}
          onClose={() => setIsTimelineContentModalOpen(false)}
          onConfirm={handleConfirmGenerateTimelineContent}
          timelineItem={selectedTimelineItem}
          allCharacters={characters}
          allLocations={locations}
          allPrompts={prompts}
          allSettings={settings}
          allEvents={events}
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
  onGenerateTimelineContent,
  onRegenerateTimelineContent,
  generatingTimelineItemId,
  candidateVersions,
  onApplyVersion,
  onClearCandidates,
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
  onSubmit: (data: { text: string }) => void;
  onTimelineChange: (timeline: ChapterTimelineItem[]) => void;
  onGenerateTimelineContent: (timelineItem: ChapterTimelineItem, index: number) => void;
  onRegenerateTimelineContent: (timelineItem: ChapterTimelineItem, index: number, currentContent?: string) => void;
  generatingTimelineItemId: string | null;
  candidateVersions: CandidateVersions | null;
  onApplyVersion: (version: ContentVersion) => void;
  onClearCandidates: () => void;
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

  // 当chapter.content变化时更新text状态和初始内容
  useEffect(() => {
    setText(chapter.content || '');
    setInitialContent(chapter.content || '');
  }, [chapter.content]);

  useEffect(() => {
    const handleOpen = () => onOpenChange(true);
    window.addEventListener('open-writing-modal', handleOpen);
    return () => window.removeEventListener('open-writing-modal', handleOpen);
  }, [onOpenChange]);

  // 关闭时自动保存
  const handleClose = async () => {
    // 保存当前内容
    onSubmit({ text });

    // 检查内容是否有变化
    const hasContentChanged = text !== initialContent;

    // 如果内容有变化且已有版本历史，自动保存新版本
    if (hasContentChanged && chapterVersions.length > 0) {
      // 自动生成版本描述
      const autoDescription = `第${currentVersion + 1}次修改`;
      onSaveVersion(autoDescription);
    }

    // 关闭modal
    onOpenChange(false);
  };

  // 包装onRegenerateTimelineContent,传递当前编辑器中的内容
  const handleRegenerateWithCurrentContent = (timelineItem: ChapterTimelineItem, index: number) => {
    // 传递当前编辑器中的内容(text是已清理标记的内容,需要传递原始的带标记的内容)
    // 但是text是用户正在编辑的内容,可能已经修改过,所以我们需要重新添加标记
    // 实际上,我们应该传递initialText(带标记的原始内容)和用户的修改
    // 为了简化,我们直接传递text,让API使用最新的内容
    onRegenerateTimelineContent(timelineItem, index, text);
  };

  // 传递原始内容(带标记),WritingModal内部会进行清理
  return (
    <WritingModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleClose}
      onTextChange={setText}
      initialText={chapter.content || ''}
      novelContext={novelContext}
      onNovelContextChange={onNovelContextChange}
      onGenerateDraft={onGenerateDraft}
      isGeneratingDraft={isGeneratingDraft}
      timeline={chapter.timeline || []}
      onTimelineChange={onTimelineChange}
      onGenerateTimelineContent={onGenerateTimelineContent}
      onRegenerateTimelineContent={handleRegenerateWithCurrentContent}
      generatingTimelineItemId={generatingTimelineItemId}
      candidateVersions={candidateVersions}
      onApplyVersion={onApplyVersion}
      onClearCandidates={onClearCandidates}
      onJumpToTimelineContent={onJumpToTimelineContent}
      chapterVersions={chapterVersions}
      currentVersion={currentVersion}
      onSaveVersion={onSaveVersion}
      onLoadVersion={onLoadVersion}
      onDeleteVersion={onDeleteVersion}
      allCharacters={allCharacters}
      allLocations={allLocations}
      allSettings={allSettings}
    />
  );
}

