/**
 * 小说内容处理工具函数
 */

import { ChapterTimelineItem } from './types';

/**
 * 生成Timeline节点的标记
 */
export function createTimelineMarker(timelineItemId: string, content: string): string {
  return `<!-- TIMELINE_NODE:${timelineItemId} -->\n${content}\n<!-- /TIMELINE_NODE -->`;
}

/**
 * 在正确的位置插入Timeline节点对应的内容
 *
 * @param currentContent 当前章节内容
 * @param newContent 新生成的内容(已包含标记)
 * @param targetTimelineId 目标timeline节点ID
 * @param targetIndex 目标节点在timeline中的索引
 * @param timeline 完整的timeline数组
 * @returns 插入后的新内容
 */
export function insertContentAtTimelinePosition(
  currentContent: string,
  newContent: string,
  targetTimelineId: string,
  targetIndex: number,
  timeline: ChapterTimelineItem[]
): string {
  // 如果当前内容为空,直接返回新内容
  if (!currentContent || currentContent.trim() === '') {
    return newContent;
  }

  // 检查是否已存在该节点的内容,如果存在则替换
  const targetStartMarker = `<!-- TIMELINE_NODE:${targetTimelineId} -->`;
  const targetEndMarker = `<!-- /TIMELINE_NODE -->`;
  const existingStartPos = currentContent.indexOf(targetStartMarker);

  if (existingStartPos !== -1) {
    // 找到了该节点的现有内容,进行替换
    const contentStart = existingStartPos + targetStartMarker.length;
    const existingEndPos = currentContent.indexOf(targetEndMarker, contentStart);

    if (existingEndPos !== -1) {
      // 提取新内容(去除标记)
      const newContentWithoutMarkers = newContent
        .replace(targetStartMarker, '')
        .replace(targetEndMarker, '')
        .trim();

      // 替换现有内容
      return (
        currentContent.slice(0, contentStart) +
        `\n${newContentWithoutMarkers}\n` +
        currentContent.slice(existingEndPos)
      );
    }
  }

  // 如果不存在该节点的内容,则插入到正确位置

  // 如果是第一个节点,插入到开头
  if (targetIndex === 0) {
    return `${newContent}\n\n${currentContent}`;
  }

  // 查找前一个节点的结束标记
  const prevNode = timeline[targetIndex - 1];
  if (!prevNode) {
    // 如果找不到前一个节点,追加到末尾
    return `${currentContent}\n\n${newContent}`;
  }

  // 正确的结束标记格式(不包含ID)
  const prevStartMarker = `<!-- TIMELINE_NODE:${prevNode.id} -->`;
  const prevEndMarker = `<!-- /TIMELINE_NODE -->`;

  // 查找前一个节点的开始位置
  const prevStartPos = currentContent.indexOf(prevStartMarker);

  if (prevStartPos !== -1) {
    // 从前一个节点的开始位置之后查找结束标记
    const prevEndPos = currentContent.indexOf(prevEndMarker, prevStartPos);

    if (prevEndPos !== -1) {
      // 找到了前一个节点的标记,在其后插入
      const insertPoint = prevEndPos + prevEndMarker.length;
      return (
        currentContent.slice(0, insertPoint) +
        `\n\n${newContent}\n\n` +
        currentContent.slice(insertPoint)
      );
    }
  }

  // 如果找不到标记,说明是旧内容或用户手动编辑过
  // 降级为追加到末尾
  return `${currentContent}\n\n${newContent}`;
}

/**
 * 清理内容中的Timeline标记(用于显示)
 * 
 * @param content 包含标记的内容
 * @returns 清理后的内容
 */
export function cleanContentForDisplay(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/<!-- TIMELINE_NODE:.*? -->\n?/g, '')
    .replace(/\n?<!-- \/TIMELINE_NODE -->/g, '')
    .trim();
}

/**
 * 检查内容是否包含Timeline标记
 */
export function hasTimelineMarkers(content: string): boolean {
  return /<!-- TIMELINE_NODE:.*? -->/.test(content);
}

/**
 * 提取特定Timeline节点的内容
 * 
 * @param content 完整内容
 * @param timelineItemId Timeline节点ID
 * @returns 该节点的内容,如果不存在返回null
 */
export function extractTimelineNodeContent(
  content: string,
  timelineItemId: string
): string | null {
  const startMarker = `<!-- TIMELINE_NODE:${timelineItemId} -->`;
  const endMarker = `<!-- /TIMELINE_NODE -->`;

  const startPos = content.indexOf(startMarker);
  if (startPos === -1) return null;

  const contentStart = startPos + startMarker.length;
  const endPos = content.indexOf(endMarker, contentStart);
  if (endPos === -1) return null;

  return content.slice(contentStart, endPos).trim();
}

/**
 * 替换特定Timeline节点的内容
 * 
 * @param content 完整内容
 * @param timelineItemId Timeline节点ID
 * @param newNodeContent 新的节点内容(不包含标记)
 * @returns 替换后的内容
 */
export function replaceTimelineNodeContent(
  content: string,
  timelineItemId: string,
  newNodeContent: string
): string {
  const startMarker = `<!-- TIMELINE_NODE:${timelineItemId} -->`;
  const endMarker = `<!-- /TIMELINE_NODE -->`;

  const startPos = content.indexOf(startMarker);
  if (startPos === -1) {
    // 如果找不到,返回原内容
    return content;
  }

  const contentStart = startPos + startMarker.length;
  const endPos = content.indexOf(endMarker, contentStart);
  if (endPos === -1) {
    return content;
  }

  // 替换内容
  return (
    content.slice(0, contentStart) +
    `\n${newNodeContent}\n` +
    content.slice(endPos)
  );
}

