'use client';

import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
}

// 简单的 Markdown 解析器 - 无需外部依赖
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // 代码块 (```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-gray-100 dark:bg-gray-800 rounded-md p-3 overflow-x-auto my-2"><code class="text-sm">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 行内代码 (`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // 斜体
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // 无序列表
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li class="ml-4">.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>');

  // 引用
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">$1</blockquote>');

  // 段落 (换行)
  html = html.replace(/\n\n/g, '</p><p class="mb-2">');
  html = '<p class="mb-2">' + html + '</p>';

  // 单个换行
  html = html.replace(/\n/g, '<br />');

  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

