import { db } from './drizzle';
import { features } from './schema';

const sampleFeatures = [
  // 已完成的功能
  {
    title: 'Speak功能',
    description: '使用TTS来进行发音，可以自行设置发音速率和不同的口音。支持多种语言和自然的语音合成。',
    status: 'completed' as const,
    priority: 100,
    version: 'v1.2.0',
    completedAt: new Date('2024-01-15'),
  },
  {
    title: 'YouGlish功能',
    description: '直接在YouTube中查找真人发音。通过真实的视频内容学习单词的正确发音和使用场景。',
    status: 'completed' as const,
    priority: 95,
    version: 'v1.2.0',
    completedAt: new Date('2024-01-15'),
  },
  {
    title: '选取单词直接获取上下文功能',
    description: '在任意区域选取单词后直接获取到单词所在的句子。智能识别上下文，提供更准确的理解。',
    status: 'completed' as const,
    priority: 90,
    version: 'v1.1.0',
    completedAt: new Date('2023-12-10'),
  },
  {
    title: 'Prompt设置',
    description: '你可以把常用的对AI的提问模板保存作为一种功能。比如创建"翻译为中文"功能，之后一键触发，无需重复输入。',
    status: 'completed' as const,
    priority: 85,
    version: 'v1.1.0',
    completedAt: new Date('2023-12-10'),
  },
  {
    title: '截屏功能',
    description: '在任意区域截屏，系统会自动获取截屏区域所在的上下文区域。当无法选取单词（比如在视频中）时会比较有效。',
    status: 'completed' as const,
    priority: 80,
    version: 'v1.0.5',
    completedAt: new Date('2023-11-20'),
  },
  {
    title: '翻译功能',
    description: '使用AI在划取任意区域后点击内置的翻译按钮进行翻译。并且你可以在功能管理器中自由设置如何进行翻译，翻译成何种语言。',
    status: 'completed' as const,
    priority: 75,
    version: 'v1.0.0',
    completedAt: new Date('2023-10-01'),
  },

  // 待实现的功能
  {
    title: 'Anki自动制卡功能',
    description: '将你选中的内容自动创建成一个合适格式的卡片并且添加到Anki中。监测Anki设置状态，支持自动和手动添加模式，可设置目标卡组。',
    status: 'planned' as const,
    priority: 95,
  },
  {
    title: 'Anki对话记录集成',
    description: '直接把对话记录添加到Anki中，然后实现一个Anki插件可以根据对话记录继续对话。以选中内容为deck正面，Q&A为文本内容。',
    status: 'planned' as const,
    priority: 90,
  },
  {
    title: '思考模型适配',
    description: '适配reasoning模型，实现同时多个相关上下文。当存在更复杂问题时使用reasoning模型，选取多段相关上下文进行深度分析。',
    status: 'planned' as const,
    priority: 85,
  },
  {
    title: '单词本功能',
    description: '把单词或任何需要学习和复习的内容添加到单词本。集成Infinite Craft，结合Anki功能，支持一键添加未添加的单词。',
    status: 'planned' as const,
    priority: 80,
  },
  {
    title: '快速搜索功能',
    description: '当创建的功能比较多时可能会总是无法及时找到需要的功能，通过搜索来快速调用功能，比如@翻译来快速调用翻译功能。',
    status: 'planned' as const,
    priority: 75,
  }
];

export async function seedFeatures() {
  try {
    console.log('开始添加示例功能数据...');
    
    // 清空现有数据（可选）
    // await db.delete(features);
    
    // 插入示例数据
    for (const feature of sampleFeatures) {
      await db.insert(features).values(feature);
      console.log(`已添加功能: ${feature.title}`);
    }
    
    console.log('示例功能数据添加完成！');
  } catch (error) {
    console.error('添加示例功能数据失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行种子数据添加
if (require.main === module) {
  seedFeatures()
    .then(() => {
      console.log('种子数据添加成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('种子数据添加失败:', error);
      process.exit(1);
    });
}
