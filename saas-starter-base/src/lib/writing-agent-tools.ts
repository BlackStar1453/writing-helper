import { tool } from 'ai';
import { z } from 'zod';

/**
 * 生成作文题目工具
 * 根据用户的学习水平和兴趣生成合适的作文题目
 */
export const generateTopicTool = tool({
  description: 'Generate an essay topic based on user level and interests. Use this when user wants to start writing or needs a topic.',
  inputSchema: z.object({
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe('User English level'),
    interest: z.string().optional().describe('User interest or preferred topic area'),
    type: z.enum(['narrative', 'descriptive', 'argumentative', 'expository']).optional().describe('Essay type'),
  }),
  execute: async ({ level, interest, type }) => {
    // 根据难度和兴趣生成题目
    const topics = {
      beginner: [
        'My Favorite Day',
        'A Special Person in My Life',
        'My Dream Vacation',
        'What I Did Last Weekend',
      ],
      intermediate: [
        'The Impact of Social Media on Modern Communication',
        'A Memorable Learning Experience',
        'The Importance of Environmental Protection',
        'How Technology Has Changed Our Lives',
      ],
      advanced: [
        'The Role of Artificial Intelligence in Future Society',
        'Analyzing the Causes and Effects of Climate Change',
        'The Ethics of Genetic Engineering',
        'Globalization: Benefits and Challenges',
      ],
    };

    const levelTopics = topics[level] || topics.intermediate;
    const selectedTopic = levelTopics[Math.floor(Math.random() * levelTopics.length)];

    return {
      topic: selectedTopic,
      level,
      type: type || 'expository',
      estimatedWords: level === 'beginner' ? '150-200' : level === 'intermediate' ? '250-350' : '400-500',
    };
  },
});

/**
 * 分析作文题目工具
 * 分析题目要求,提供写作建议和大纲
 */
export const analyzeTopicTool = tool({
  description: 'Analyze an essay topic and provide writing guidance, outline, and key points. Use this after a topic is selected.',
  inputSchema: z.object({
    topic: z.string().describe('The essay topic to analyze'),
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe('User English level'),
  }),
  execute: async ({ topic, level }) => {
    // 分析题目并生成写作指导
    return {
      topic,
      analysis: `This topic requires you to ${topic.toLowerCase().includes('describe') ? 'describe' : topic.toLowerCase().includes('argue') ? 'argue' : 'explain'} your ideas clearly.`,
      outline: [
        {
          section: 'Introduction',
          points: ['Hook the reader', 'Introduce the topic', 'State your main idea'],
        },
        {
          section: 'Body Paragraphs',
          points: ['Present main points', 'Provide examples and evidence', 'Explain your reasoning'],
        },
        {
          section: 'Conclusion',
          points: ['Summarize main points', 'Restate your position', 'Final thoughts'],
        },
      ],
      keyVocabulary: level === 'beginner' 
        ? ['first', 'second', 'finally', 'because', 'for example']
        : level === 'intermediate'
        ? ['furthermore', 'however', 'consequently', 'in addition', 'on the other hand']
        : ['nevertheless', 'notwithstanding', 'subsequently', 'conversely', 'moreover'],
      tips: [
        'Start with a clear thesis statement',
        'Use topic sentences for each paragraph',
        'Support your ideas with specific examples',
        'Check grammar and spelling before submitting',
      ],
    };
  },
});

/**
 * 分步写作指导工具
 * 根据用户当前进度提供下一步写作建议
 */
export const guidedWritingTool = tool({
  description: 'Provide step-by-step writing guidance based on current progress. Use this to help user write section by section.',
  inputSchema: z.object({
    topic: z.string().describe('The essay topic'),
    currentSection: z.enum(['introduction', 'body', 'conclusion']).describe('Current section being written'),
    currentText: z.string().optional().describe('Text written so far'),
  }),
  execute: async ({ topic, currentSection, currentText }) => {
    const guidance = {
      introduction: {
        instruction: 'Write an engaging introduction that hooks the reader and introduces your topic.',
        tips: [
          'Start with an interesting fact, question, or quote',
          'Provide background information about the topic',
          'End with a clear thesis statement',
        ],
        example: 'In today\'s digital age, [topic] has become increasingly important...',
      },
      body: {
        instruction: 'Develop your main points with supporting details and examples.',
        tips: [
          'Start each paragraph with a topic sentence',
          'Provide specific examples and evidence',
          'Use transition words to connect ideas',
          'Explain how your examples support your main point',
        ],
        example: 'First and foremost, [main point]. For instance, [example]...',
      },
      conclusion: {
        instruction: 'Summarize your main points and leave a lasting impression.',
        tips: [
          'Restate your thesis in different words',
          'Summarize your main points briefly',
          'End with a thought-provoking statement or call to action',
          'Do not introduce new information',
        ],
        example: 'In conclusion, [topic] demonstrates that [main idea]...',
      },
    };

    const sectionGuidance = guidance[currentSection];
    const wordCount = currentText ? currentText.split(/\s+/).length : 0;

    return {
      section: currentSection,
      ...sectionGuidance,
      currentWordCount: wordCount,
      feedback: currentText 
        ? `You've written ${wordCount} words so far. ${wordCount < 50 ? 'Try to develop your ideas more fully.' : 'Good progress! Keep going.'}`
        : 'Start writing this section following the tips above.',
    };
  },
});

/**
 * 评估作文工具
 * 对完成的作文进行评分和反馈
 */
export const evaluateWritingTool = tool({
  description: 'Evaluate completed essay and provide score with detailed feedback. Use this after user finishes writing.',
  inputSchema: z.object({
    topic: z.string().describe('The essay topic'),
    text: z.string().describe('The complete essay text'),
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe('User English level'),
  }),
  execute: async ({ topic, text, level }) => {
    // 简单的评估逻辑
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    
    // 计算分数 (简化版)
    let contentScore = Math.min(100, (wordCount / 300) * 40); // 最多40分
    let structureScore = sentenceCount >= 5 ? 30 : (sentenceCount / 5) * 30; // 最多30分
    let languageScore = avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20 ? 30 : 20; // 最多30分
    
    const totalScore = Math.round(contentScore + structureScore + languageScore);

    return {
      score: totalScore,
      maxScore: 100,
      breakdown: {
        content: Math.round(contentScore),
        structure: Math.round(structureScore),
        language: Math.round(languageScore),
      },
      wordCount,
      sentenceCount,
      strengths: [
        wordCount >= 200 ? 'Good length and development' : null,
        sentenceCount >= 5 ? 'Well-structured with multiple paragraphs' : null,
        avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20 ? 'Appropriate sentence length' : null,
      ].filter(Boolean),
      improvements: [
        wordCount < 200 ? 'Try to develop your ideas more fully with more details and examples' : null,
        sentenceCount < 5 ? 'Add more paragraphs to better organize your ideas' : null,
        avgWordsPerSentence < 10 ? 'Use more complex sentences to express your ideas' : null,
        avgWordsPerSentence > 20 ? 'Break down long sentences for better readability' : null,
      ].filter(Boolean),
      overallFeedback: totalScore >= 80 
        ? 'Excellent work! Your essay is well-written and demonstrates strong English skills.'
        : totalScore >= 60
        ? 'Good effort! With some improvements, your essay will be even better.'
        : 'Keep practicing! Focus on developing your ideas more fully and organizing your thoughts clearly.',
    };
  },
});

/**
 * 保存作文工具
 * 保存作文到历史记录
 */
export const saveEssayTool = tool({
  description: 'Save the essay to writing history. Use this after evaluation is complete.',
  inputSchema: z.object({
    topic: z.string().describe('The essay topic'),
    text: z.string().describe('The complete essay text'),
    score: z.number().describe('The evaluation score'),
  }),
  execute: async ({ topic, text, score }) => {
    // 这个工具的实际保存逻辑会在前端处理
    // 这里只是返回确认信息
    return {
      saved: true,
      topic,
      wordCount: text.split(/\s+/).length,
      score,
      savedAt: new Date().toISOString(),
      message: 'Your essay has been saved to writing history. You can review it anytime!',
    };
  },
});

/**
 * 开始引导写作工具
 * 初始化引导写作流程,返回题目和第一步指导
 */
export const startGuidedWritingTool = tool({
  description: 'Start guided writing workflow with a topic and first step guidance. Use this when user wants to begin step-by-step writing practice.',
  inputSchema: z.object({
    topic: z.string().describe('The essay topic (user provided or generated)'),
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe('User English level'),
  }),
  execute: async ({ topic, level }) => {
    // 返回引导写作数据
    const firstStep = {
      name: 'introduction',
      displayName: 'Introduction',
      instruction: 'Write an engaging introduction that hooks the reader and introduces your topic.',
      tips: [
        'Start with an interesting fact, question, or quote to grab attention',
        'Provide background information about the topic',
        'End with a clear thesis statement that previews your main points',
        'Keep it concise - aim for 3-5 sentences',
      ],
      example: level === 'beginner'
        ? 'In today\'s world, [topic] is very important. Many people think about this topic. In this essay, I will explain my ideas about [topic].'
        : level === 'intermediate'
        ? 'In today\'s digital age, [topic] has become increasingly important. This essay will explore the key aspects of [topic] and discuss its impact on our daily lives.'
        : 'The question of [topic] has sparked considerable debate in recent years. This essay will critically examine the various perspectives surrounding [topic] and argue that [thesis statement].',
    };

    return {
      topic,
      level,
      currentStep: firstStep,
      completedSteps: [],
      message: `Great! Let's start writing about "${topic}". Click the "开始写作" button to begin with the Introduction.`,
    };
  },
});

/**
 * 获取下一步骤工具
 * 根据当前步骤返回下一步的指导内容
 */
export const getNextStepTool = tool({
  description: 'Get the next writing step guidance after completing current step.',
  inputSchema: z.object({
    currentStepName: z.enum(['introduction', 'body1', 'body2', 'body3', 'conclusion']).describe('Current step name'),
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe('User English level'),
  }),
  execute: async ({ currentStepName, level }) => {
    const stepSequence = ['introduction', 'body1', 'body2', 'body3', 'conclusion'];
    const currentIndex = stepSequence.indexOf(currentStepName);

    if (currentIndex === -1 || currentIndex >= stepSequence.length - 1) {
      return {
        isComplete: true,
        message: 'Congratulations! You have completed all writing steps.',
      };
    }

    const nextStepName = stepSequence[currentIndex + 1];
    const stepGuidance: Record<string, any> = {
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
        example: level === 'beginner'
          ? 'First, [main point]. For example, [example]. This shows that [explanation].'
          : level === 'intermediate'
          ? 'First and foremost, [main point]. For instance, [specific example]. This demonstrates that [analysis].'
          : 'To begin with, [main point]. A compelling illustration of this can be seen in [detailed example]. This evidence suggests that [critical analysis].',
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
        example: level === 'beginner'
          ? 'Second, [main point]. Another example is [example]. This is important because [explanation].'
          : level === 'intermediate'
          ? 'Furthermore, [main point]. Another significant example is [specific example]. This illustrates that [analysis].'
          : 'Moreover, [main point]. Additional evidence supporting this perspective includes [detailed example]. This further reinforces the argument that [critical analysis].',
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
        example: level === 'beginner'
          ? 'Finally, [main point]. The last example is [example]. This proves that [explanation].'
          : level === 'intermediate'
          ? 'Finally, [main point]. A final example that supports this is [specific example]. This clearly shows that [analysis].'
          : 'Finally, [main point]. While some may argue [counterargument], the evidence overwhelmingly suggests [your position]. This is exemplified by [detailed example].',
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
        example: level === 'beginner'
          ? 'In conclusion, [topic] is important. I explained [point 1], [point 2], and [point 3]. I think [final thought].'
          : level === 'intermediate'
          ? 'In conclusion, this essay has explored [topic] by examining [main points]. It is clear that [restated thesis]. Moving forward, [final thought].'
          : 'In conclusion, this analysis has demonstrated that [restated thesis] through examination of [main points]. As we move forward, it is imperative that [call to action or final insight].',
      },
    };

    return {
      nextStep: stepGuidance[nextStepName],
      isComplete: false,
      message: `Great work! Now let's move on to ${stepGuidance[nextStepName].displayName}.`,
    };
  },
});

/**
 * 所有写作Agent工具的集合
 */
export const writingAgentTools = {
  generateTopic: generateTopicTool,
  analyzeTopic: analyzeTopicTool,
  guidedWriting: guidedWritingTool,
  evaluateWriting: evaluateWritingTool,
  saveEssay: saveEssayTool,
  startGuidedWriting: startGuidedWritingTool,
  getNextStep: getNextStepTool,
};

