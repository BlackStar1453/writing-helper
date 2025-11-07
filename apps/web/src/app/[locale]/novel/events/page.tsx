'use client';

import { useState } from 'react';
import { NovelNav } from '@/components/novel/NovelNav';
import { useEvents } from '@/lib/novel/hooks/use-events';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useLocations } from '@/lib/novel/hooks/use-locations';
import { useSettings } from '@/lib/novel/hooks/use-settings';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { EventCard } from '@/components/novel/EventCard';
import { EventDialog } from '@/components/novel/EventDialog';
import { Button } from '@/components/ui/button';
import { EventCard as EventCardType } from '@/lib/novel/types';

export default function EventsPage() {
  const { currentNovelId } = useNovels();
  const { events, createEvent, updateEvent, deleteEvent } = useEvents(currentNovelId);
  const { characters, createCharacter } = useCharacters(currentNovelId);
  const { locations } = useLocations(currentNovelId);
  const { settings } = useSettings(currentNovelId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventCardType | null>(null);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: EventCardType) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个事件卡片吗?')) {
      await deleteEvent(id);
    }
  };

  return (
    <>
      <NovelNav />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">事件管理</h1>
          <Button
            onClick={handleCreate}
            variant="outline"
            className="border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          >
            创建事件
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 dark:text-gray-600 font-light mb-4">
              暂无事件
            </p>
            <Button
              onClick={handleCreate}
              variant="outline"
              className="border-gray-200 dark:border-gray-700"
            >
              创建第一个事件
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                characters={characters}
                locations={locations}
                settings={settings}
                events={events}
                onEdit={() => handleEdit(event)}
                onDelete={() => handleDelete(event.id)}
              />
            ))}
          </div>
        )}

        <EventDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          event={editingEvent}
          characters={characters}
          locations={locations}
          settings={settings}
          events={events}
          novelId={currentNovelId || ''}
          onCreateCharacter={createCharacter}
          onCreate={createEvent}
          onUpdate={updateEvent}
        />
      </div>
    </>
  );
}

