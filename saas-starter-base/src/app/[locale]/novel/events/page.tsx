'use client';

import { useState } from 'react';
import { useEvents } from '@/lib/novel/hooks/use-events';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useLocations } from '@/lib/novel/hooks/use-locations';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { EventCard } from '@/components/novel/EventCard';
import { EventDialog } from '@/components/novel/EventDialog';
import { Button } from '@/components/ui/button';
import { EventCard as EventCardType } from '@/lib/novel/types';

export default function EventsPage() {
  const { currentNovelId } = useNovels();
  const { events, createEvent, updateEvent, deleteEvent } = useEvents(currentNovelId);
  const { characters } = useCharacters(currentNovelId);
  const { locations } = useLocations(currentNovelId);
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">事件卡片</h1>
        <Button onClick={handleCreate}>创建事件</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            characters={characters}
            locations={locations}
            onEdit={() => handleEdit(event)}
            onDelete={() => handleDelete(event.id)}
          />
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center text-gray-500 mt-12">
          <p>暂无事件卡片</p>
          <p className="text-sm mt-2">点击"创建事件"按钮开始创建</p>
        </div>
      )}

      <EventDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        event={editingEvent}
        characters={characters}
        locations={locations}
        onCreate={createEvent}
        onUpdate={updateEvent}
      />
    </div>
  );
}

