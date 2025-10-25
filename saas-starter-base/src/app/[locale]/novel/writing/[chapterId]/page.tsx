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
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { NovelContext, Chapter, ChapterTimelineItem } from '@/lib/novel/types';
import { getSettings } from '@/lib/db-utils';
import { GenerateDraftSettingsModal, GenerateDraftSettings } from '@/components/novel/GenerateDraftSettingsModal';
import { GenerateTimelineContentModal } from '@/components/novel/GenerateTimelineContentModal';
import { insertContentAtTimelinePosition, cleanContentForDisplay } from '@/lib/novel/content-utils';
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
  const handleGenerateTimeline = async (settings: GenerateDraftSettings) => {
    try {
      setIsGeneratingTimeline(true);

      // 获取API设置
      const apiSettings = await getSettings();

      // 检查API Token
      if (!apiSettings.apiToken) {
        toast.error('请先在设置中配置API Token');
        return;
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

      // 更新章节的timeline
      if (chapter && data.timeline) {
        await updateChapter(chapter.id, {
          timeline: data.timeline,
        });

        // 重新加载章节
        await loadChapter();
      }
    } catch (err) {
      console.error('Failed to generate timeline:', err);
      toast.error('生成Timeline失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  // 确认生成初稿
  const handleConfirmGenerate = async (settings: GenerateDraftSettings) => {
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
          timeline: chapter?.timeline || [], // 添加当前章节的timeline
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
        // 只有当API返回了新的timeline时才更新,否则保留现有timeline
        const updateData: any = {
          content: data.content,
          selectedCharacters: settings.selectedCharacters?.map(c => c.id),
          selectedLocations: settings.selectedLocations?.map(l => l.id),
          plotSummary: settings.plotSummary,
          chapterPrompt: settings.chapterPrompt,
        };

        // 如果API返回了timeline(即没有传入timeline时生成的),则更新timeline
        if (data.timeline && data.timeline.length > 0) {
          updateData.timeline = data.timeline;
        }

        await updateChapter(chapter.id, updateData);

        // 重新加载章节
        await loadChapter();
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

      const context = {
        ...novelContext,
        selectedCharacters,
        selectedLocations,
        selectedPrompts,
        selectedSettings,
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
          isOpen={isWritingModalOpen}
          onOpenChange={setIsWritingModalOpen}
        />

        {/* 生成初稿设置Modal */}
        <GenerateDraftSettingsModal
          open={isSettingsModalOpen}
          onOpenChange={setIsSettingsModalOpen}
          allChapters={chapters}
          allCharacters={characters}
          allLocations={locations}
          allSettings={settings}
          currentChapterId={chapterId}
          initialSettings={{
            selectedCharacters: novelContext.selectedCharacters,
            selectedLocations: novelContext.selectedLocations,
            selectedSettings: novelContext.selectedSettings,
            plotSummary: novelContext.plotSummary || '',
            chapterPrompt: novelContext.chapterPrompt || '',
            globalPrompt: novelContext.globalPrompt || '',
          }}
          onConfirm={handleConfirmGenerate}
          onGenerateTimeline={handleGenerateTimeline}
          isGeneratingTimeline={isGeneratingTimeline}
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
  generatingTimelineItemId,
  candidateVersions,
  onApplyVersion,
  onClearCandidates,
  onJumpToTimelineContent,
  isOpen,
  onOpenChange,
}: {
  chapter: Chapter;
  novelContext: NovelContext;
  onNovelContextChange: (context: NovelContext) => void;
  onGenerateDraft: () => void;
  isGeneratingDraft: boolean;
  onSubmit: (data: { text: string }) => void;
  onTimelineChange: (timeline: ChapterTimelineItem[]) => void;
  onGenerateTimelineContent: (timelineItem: ChapterTimelineItem, index: number) => void;
  generatingTimelineItemId: string | null;
  candidateVersions: CandidateVersions | null;
  onApplyVersion: (version: ContentVersion) => void;
  onClearCandidates: () => void;
  onJumpToTimelineContent: (timelineItemId: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState(chapter.content || '');

  // 当chapter.content变化时更新text状态
  useEffect(() => {
    setText(chapter.content || '');
  }, [chapter.content]);

  useEffect(() => {
    const handleOpen = () => onOpenChange(true);
    window.addEventListener('open-writing-modal', handleOpen);
    return () => window.removeEventListener('open-writing-modal', handleOpen);
  }, [onOpenChange]);

  // 关闭时自动保存
  const handleClose = () => {
    // 保存当前内容
    onSubmit({ text });
    // 关闭modal
    onOpenChange(false);
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
      generatingTimelineItemId={generatingTimelineItemId}
      candidateVersions={candidateVersions}
      onApplyVersion={onApplyVersion}
      onClearCandidates={onClearCandidates}
      onJumpToTimelineContent={onJumpToTimelineContent}
    />
  );
}

