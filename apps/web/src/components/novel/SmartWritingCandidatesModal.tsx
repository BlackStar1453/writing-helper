/**
 * 智能续写/重写候选版本选择Modal
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export interface SmartWritingCandidate {
  version: number;
  content: string;
  description: string;
}

interface SmartWritingCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'continue' | 'rewrite';
  candidates: SmartWritingCandidate[];
  onApply: (candidate: SmartWritingCandidate) => void;
  // 新增：基于选中版本+反馈继续生成
  onIterate?: (args: { base: SmartWritingCandidate; feedback: string }) => Promise<void>;
  isIterating?: boolean;
}

export function SmartWritingCandidatesModal({
  isOpen,
  onClose,
  mode,
  candidates,
  onApply,
  onIterate,
  isIterating = false,
}: SmartWritingCandidatesModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleApply = () => {
    if (selectedVersion === null) return;

    const selectedCandidate = candidates.find(c => c.version === selectedVersion);
    if (selectedCandidate) {
      onApply(selectedCandidate);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-light">
                {mode === 'continue' ? '选择续写内容' : '选择重写版本'}
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.version}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedVersion === candidate.version
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 hover:shadow-sm'
                }`}
                onClick={() => setSelectedVersion(candidate.version)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="radio"
                    checked={selectedVersion === candidate.version}
                    onChange={() => setSelectedVersion(candidate.version)}
                    className="flex-shrink-0"
                  />
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {candidate.description}
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-light leading-relaxed">
                  {candidate.content}
                </p>
              </div>
            ))}
          </div>
        </div>
          {/* 反馈与迭代 */}
          {onIterate && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 space-y-2">
              <div className="text-sm font-medium">优化反馈（可选）</div>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="写下你想改进的方向，比如：节奏更紧凑、对白更口语化、突出人物内心..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const selectedCandidate = candidates.find(c => c.version === selectedVersion);
                    if (!selectedCandidate || !onIterate) return;
                    await onIterate({ base: selectedCandidate, feedback });
                  }}
                  disabled={selectedVersion === null || isIterating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-light disabled:opacity-50"
                >
                  {isIterating ? '生成中…' : '基于选中版本生成3个新版本'}
                </Button>
              </div>
            </div>
          )}

        <DialogFooter className="flex-shrink-0 flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-light"
          >
            取消
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedVersion === null}
            className="bg-blue-500 hover:bg-blue-600 text-white font-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            应用选中版本
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
