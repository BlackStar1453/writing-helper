/**
 * 构建小说创作 Prompt
 */
export function buildNovelPrompt(context: any): string {
  const parts: string[] = [];

  // 参考章节
  if (context.referenceChapters && context.referenceChapters.length > 0) {
    parts.push(`## 参考章节`);
    parts.push(`以下是已完成的章节内容,请保持风格一致:`);
    parts.push('');
    context.referenceChapters.forEach((chapter: any) => {
      parts.push(`### ${chapter.volume} > ${chapter.chapter} > ${chapter.section}`);
      parts.push(`**标题:** ${chapter.title}`);
      parts.push(`**内容:**`);
      parts.push(chapter.content);
      parts.push('');
    });
  }

  // 章节信息
  if (context.chapterInfo) {
    parts.push(`## 章节信息`);
    parts.push(`${context.chapterInfo.volume} > ${context.chapterInfo.chapter} > ${context.chapterInfo.section} `);
    parts.push(`标题: ${context.chapterInfo.title}`);
    parts.push('');
  }

  // 剧情时间线
  if (context.timeline && context.timeline.length > 0) {
    parts.push(`## 剧情时间线`);
    parts.push(`本章节需要按照以下时间线展开:`);
    parts.push('');
    context.timeline.forEach((item: any, index: number) => {
      parts.push(`${index + 1}. ${item.content}`);
    });
    parts.push('');
  }

  // 情节概括
  if (context.plotSummary) {
    parts.push(`## 情节概括`);
    parts.push(context.plotSummary);
    parts.push('');
  }

  // 全局 Prompt
  if (context.globalPrompt) {
    parts.push(`## 全局要求`);
    parts.push(context.globalPrompt);
    parts.push('');
  }

  // 章节 Prompt
  if (context.chapterPrompt) {
    parts.push(`## 本章要求`);
    parts.push(context.chapterPrompt);
    parts.push('');
  }

  // 人物卡片
  if (context.selectedCharacters && context.selectedCharacters.length > 0) {
    parts.push(`## 相关人物`);
    context.selectedCharacters.forEach((character: any) => {
      parts.push(`### ${character.name}`);
      if (character.description) {
        parts.push(`**描述:** ${character.description}`);
      }
      if (character.personality) {
        parts.push(`**性格:** ${character.personality}`);
      }
      if (character.background) {
        parts.push(`**背景:** ${character.background}`);
      }
      if (character.appearance) {
        parts.push(`**外貌:** ${character.appearance}`);
      }
      if (character.relationships && character.relationships.length > 0) {
        parts.push(`**关系:**`);
        character.relationships.forEach((rel: any) => {
          parts.push(`- ${rel.targetName}: ${rel.description}`);
        });
      }
      parts.push('');
    });
  }

  // 地点卡片
  if (context.selectedLocations && context.selectedLocations.length > 0) {
    parts.push(`## 相关地点`);
    context.selectedLocations.forEach((location: any) => {
      parts.push(`### ${location.name}`);
      if (location.description) {
        parts.push(`**描述:** ${location.description}`);
      }
      if (location.atmosphere) {
        parts.push(`**氛围:** ${location.atmosphere}`);
      }
      if (location.features) {
        parts.push(`**特征:** ${location.features}`);
      }
      parts.push('');
    });
  }

  // 设定卡片
  if (context.selectedSettings && context.selectedSettings.length > 0) {
    parts.push(`## 相关设定`);
    context.selectedSettings.forEach((setting: any) => {
      parts.push(`### ${setting.name}`);
      if (setting.description) {
        parts.push(`**描述:** ${setting.description}`);
      }
      if (setting.rules && setting.rules.length > 0) {
        parts.push(`**规则:**`);
        setting.rules.forEach((rule: any) => {
          parts.push(`- ${rule.description}`);
        });
      }
      parts.push('');
    });
  }

  // 事件卡片 - 作为剧情大纲
  if (context.selectedEvents && context.selectedEvents.length > 0) {
    parts.push(`## 剧情大纲(必须遵循)`);
    parts.push(`本章节需要按照以下事件流程展开,每个步骤都必须在正文中体现:`);
    parts.push('');
    context.selectedEvents.forEach((event: any) => {
      parts.push(`### 事件: ${event.name}`);
      parts.push(`**事件概述:** ${event.outline}`);
      if (event.process && event.process.length > 0) {
        parts.push(`\n**详细流程(请严格按照以下步骤展开剧情):**`);
        event.process.forEach((step: any, index: number) => {
          parts.push(`${index + 1}. ${step.description}`);
        });
        parts.push('');
        parts.push(`**重要提示:** 请确保在正文中清晰地描写每一个步骤,不要跳过或合并步骤。`);
      }
      parts.push('');
    });
  }

  // Prompt卡片
  if (context.selectedPrompts && context.selectedPrompts.length > 0) {
    parts.push(`## 写作风格`);
    context.selectedPrompts.forEach((prompt: any) => {
      parts.push(`### ${prompt.name}`);
      if (prompt.description) {
        parts.push(prompt.description);
      }
      if (prompt.content) {
        parts.push(prompt.content);
      }
      parts.push('');
    });
  }

  parts.push(`## 任务`);
  parts.push(`请根据以上信息,创作这一章节的内容。要求:`);

  let requirementIndex = 1;

  // 如果有事件卡片,优先强调
  if (context.selectedEvents && context.selectedEvents.length > 0) {
    parts.push(`${requirementIndex}. **【最重要】严格按照"剧情大纲"中的事件流程展开,每个步骤都必须在正文中详细描写,不得省略或跳过**`);
    requirementIndex++;
  }

  parts.push(`${requirementIndex}. 内容要符合人物性格和背景`);
  requirementIndex++;
  parts.push(`${requirementIndex}. 场景描写要生动具体`);
  requirementIndex++;
  parts.push(`${requirementIndex}. 情节推进要自然流畅`);
  requirementIndex++;

  if (context.timeline && context.timeline.length > 0) {
    parts.push(`${requirementIndex}. 严格按照剧情时间线展开创作,确保每个节点都有对应的内容`);
    requirementIndex++;
  }

  if (context.referenceChapters && context.referenceChapters.length > 0) {
    parts.push(`${requirementIndex}. 保持与参考章节的风格一致性和情节连贯性`);
    requirementIndex++;
  }

  parts.push(`${requirementIndex}. 字数控制在800-1500字左右`);
  parts.push('');

  // 如果有timeline,只要求输出正文;否则要求输出timeline和正文
  if (context.timeline && context.timeline.length > 0) {
    parts.push(`## 输出格式`);
    parts.push(`请按照以下格式输出:`);
    parts.push('');
    parts.push(`<CONTENT>`);
    parts.push(`[章节正文内容]`);
    parts.push(`</CONTENT>`);
    parts.push('');
    parts.push(`说明:`);
    parts.push(`- CONTENT部分是完整的章节正文`);
  } else {
    parts.push(`## 输出格式`);
    parts.push(`请按照以下格式输出:`);
    parts.push('');
    parts.push(`<TIMELINE>`);
    parts.push(`1. [第一个剧情节点的描述]`);
    parts.push(`2. [第二个剧情节点的描述]`);
    parts.push(`3. [第三个剧情节点的描述]`);
    parts.push(`...`);
    parts.push(`</TIMELINE>`);
    parts.push('');
    parts.push(`<CONTENT>`);
    parts.push(`[章节正文内容]`);
    parts.push(`</CONTENT>`);
    parts.push('');
    parts.push(`说明:`);
    parts.push(`- TIMELINE部分列出本章节的剧情发展时间线,每个节点用序号标注`);
    parts.push(`- CONTENT部分是完整的章节正文`);
    parts.push(`- 时间线应该清晰地表明在不同阶段发生了什么,以及剧情是如何推进的`);
  }

  return parts.join('\n');
}

