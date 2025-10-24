/**
 * 人物管理页面
 */

'use client';

import React, { useState } from 'react';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { CharacterCard } from '@/components/novel/CharacterCard';
import { CharacterDialog } from '@/components/novel/CharacterDialog';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { Character } from '@/lib/novel/types';
import { Plus, Loader2 } from 'lucide-react';

export default function CharactersPage() {
  const { currentNovelId } = useNovels();
  const {
    characters,
    loading,
    error,
    createCharacter,
    updateCharacter,
    deleteCharacter
  } = useCharacters(currentNovelId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const handleCreate = () => {
    setEditingCharacter(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<Character>) => {
    if (editingCharacter) {
      await updateCharacter(editingCharacter.id, data);
    } else {
      await createCharacter(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个人物吗?这将同时删除所有相关的关系。')) {
      await deleteCharacter(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <NovelNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">人物管理</h1>
            <p className="text-gray-500 mt-2">管理你的小说人物</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
          创建人物
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">还没有创建任何人物</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            创建第一个人物
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CharacterDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        character={editingCharacter}
      />
      </div>
    </>
  );
}

