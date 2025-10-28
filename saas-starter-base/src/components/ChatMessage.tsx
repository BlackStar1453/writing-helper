'use client';

import { MarkdownContent } from './MarkdownContent';

interface ToolInvocation {
  state: 'call' | 'result' | 'partial-call';
  toolCallId: string;
  toolName: string;
  args?: any;
  result?: any;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  toolInvocations?: ToolInvocation[];
}

export function ChatMessage({ role, content, isStreaming, toolInvocations }: ChatMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center mb-4">
        <div className="max-w-[80%] px-4 py-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-sm rounded-lg text-center">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          }
        `}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <>
            {content && <MarkdownContent content={content} />}

            {/* Display tool invocations */}
            {toolInvocations && toolInvocations.length > 0 && (
              <div className="mt-3 space-y-2">
                {toolInvocations.map((tool, index) => (
                  <div
                    key={tool.toolCallId || index}
                    className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {getToolDisplayName(tool.toolName)}
                      </span>
                      {tool.state === 'call' && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          (executing...)
                        </span>
                      )}
                    </div>

                    {tool.state === 'result' && tool.result && (
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {renderToolResult(tool.toolName, tool.result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {isStreaming && (
          <div className="flex gap-1 mt-2">
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></span>
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></span>
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get display name for tools
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    generateTopic: '📝 Generating Topic',
    analyzeTopic: '🔍 Analyzing Topic',
    guidedWriting: '✍️ Writing Guidance',
    evaluateWriting: '📊 Evaluating Essay',
    saveEssay: '💾 Saving Essay',
  };
  return displayNames[toolName] || toolName;
}

// Helper function to render tool results
function renderToolResult(toolName: string, result: any): React.ReactElement {
  try {
    switch (toolName) {
      case 'generateTopic':
        return (
          <div>
            <p className="font-semibold mb-1">Topic: {result.topic}</p>
            <p className="text-xs">Level: {result.level} | Type: {result.type}</p>
            <p className="text-xs">Estimated words: {result.estimatedWords}</p>
          </div>
        );

      case 'analyzeTopic':
        return (
          <div>
            <p className="font-semibold mb-2">{result.topic}</p>
            <p className="mb-2">{result.analysis}</p>
            <div className="mb-2">
              <p className="font-semibold text-xs mb-1">Outline:</p>
              {result.outline?.map((section: any, i: number) => (
                <div key={i} className="ml-2 mb-1">
                  <p className="font-medium text-xs">{section.section}:</p>
                  <ul className="ml-4 text-xs list-disc">
                    {section.points?.map((point: string, j: number) => (
                      <li key={j}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs"><strong>Key vocabulary:</strong> {result.keyVocabulary?.join(', ')}</p>
          </div>
        );

      case 'guidedWriting':
        return (
          <div>
            <p className="font-semibold mb-1">{result.section} Section</p>
            <p className="mb-2">{result.instruction}</p>
            <p className="text-xs mb-1"><strong>Tips:</strong></p>
            <ul className="ml-4 text-xs list-disc mb-2">
              {result.tips?.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
            <p className="text-xs italic">{result.feedback}</p>
          </div>
        );

      case 'evaluateWriting':
        return (
          <div>
            <p className="font-semibold mb-2 text-lg">Score: {result.score}/{result.maxScore}</p>
            <div className="mb-2">
              <p className="text-xs font-semibold mb-1">Breakdown:</p>
              <p className="text-xs">Content: {result.breakdown?.content}/40</p>
              <p className="text-xs">Structure: {result.breakdown?.structure}/30</p>
              <p className="text-xs">Language: {result.breakdown?.language}/30</p>
            </div>
            <p className="text-xs mb-2">{result.overallFeedback}</p>
            {result.strengths && result.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold">Strengths:</p>
                <ul className="ml-4 text-xs list-disc">
                  {result.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.improvements && result.improvements.length > 0 && (
              <div>
                <p className="text-xs font-semibold">Areas for Improvement:</p>
                <ul className="ml-4 text-xs list-disc">
                  {result.improvements.map((imp: string, i: number) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'saveEssay':
        return (
          <div>
            <p className="font-semibold mb-1">✅ {result.message}</p>
            <p className="text-xs">Words: {result.wordCount} | Score: {result.score}</p>
          </div>
        );

      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
    }
  } catch (error) {
    return <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
  }
}

