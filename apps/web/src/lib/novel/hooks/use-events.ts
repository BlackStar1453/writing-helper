/**
 * 事件卡片管理 Hook
 */

import { useState, useEffect } from 'react';
import { EventCard, EventProcess } from '../types';
import { getStorageAdapter } from '../storage/index';
import { generateUUID } from '../platform-utils';

export function useEvents(novelId: string | null) {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载事件卡片列表
  const loadEvents = async () => {
    if (!novelId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const storage = getStorageAdapter();
      const allEvents = await storage.list('events');
      const filteredEvents = allEvents.filter((e: EventCard) => e.novelId === novelId);
      setEvents(filteredEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [novelId]);

  // 创建事件卡片
  const createEvent = async (
    name: string,
    outline: string,
    process: EventProcess[],
    relatedCharacterIds: string[],
    relatedLocationIds: string[],
    relatedSettingIds: string[],
    relatedEventIds: string[]
  ): Promise<EventCard> => {
    if (!novelId) {
      throw new Error('No novel selected');
    }

    const newEvent = {
      novelId,
      name,
      outline,
      process,
      relatedCharacterIds,
      relatedLocationIds,
      relatedSettingIds,
      relatedEventIds,
    };

    const storage = getStorageAdapter();
    const id = await storage.create('events', newEvent);

    // 处理双向关联:为关联的事件添加反向关联
    if (relatedEventIds.length > 0) {
      for (const relatedEventId of relatedEventIds) {
        try {
          const relatedEvent = await storage.read('events', relatedEventId) as EventCard;
          if (relatedEvent && !relatedEvent.relatedEventIds.includes(id)) {
            const updatedRelatedEvent = {
              ...relatedEvent,
              relatedEventIds: [...relatedEvent.relatedEventIds, id],
              updatedAt: new Date(),
            };
            await storage.update('events', relatedEventId, updatedRelatedEvent);
          }
        } catch (error) {
          console.error(`Failed to update related event ${relatedEventId}:`, error);
        }
      }
    }

    await loadEvents();

    // 返回创建的事件(包含生成的ID和时间戳)
    const createdEvent = await storage.read('events', id) as EventCard;
    return createdEvent;
  };

  // 更新事件卡片
  const updateEvent = async (
    id: string,
    updates: {
      name?: string;
      outline?: string;
      process?: EventProcess[];
      relatedCharacterIds?: string[];
      relatedLocationIds?: string[];
      relatedSettingIds?: string[];
      relatedEventIds?: string[];
    }
  ): Promise<void> => {
    const storage = getStorageAdapter();
    const event = await storage.read('events', id) as EventCard;
    if (!event) {
      throw new Error('Event not found');
    }

    // 处理双向关联:如果relatedEventIds发生变化
    if (updates.relatedEventIds !== undefined) {
      const oldRelatedEventIds = event.relatedEventIds || [];
      const newRelatedEventIds = updates.relatedEventIds;

      // 找出新增的关联
      const addedEventIds = newRelatedEventIds.filter(eid => !oldRelatedEventIds.includes(eid));
      // 找出移除的关联
      const removedEventIds = oldRelatedEventIds.filter(eid => !newRelatedEventIds.includes(eid));

      // 为新增的关联事件添加反向关联
      for (const relatedEventId of addedEventIds) {
        try {
          const relatedEvent = await storage.read('events', relatedEventId) as EventCard;
          if (relatedEvent && !relatedEvent.relatedEventIds.includes(id)) {
            const updatedRelatedEvent = {
              ...relatedEvent,
              relatedEventIds: [...relatedEvent.relatedEventIds, id],
              updatedAt: new Date(),
            };
            await storage.update('events', relatedEventId, updatedRelatedEvent);
          }
        } catch (error) {
          console.error(`Failed to update related event ${relatedEventId}:`, error);
        }
      }

      // 为移除的关联事件删除反向关联
      for (const relatedEventId of removedEventIds) {
        try {
          const relatedEvent = await storage.read('events', relatedEventId) as EventCard;
          if (relatedEvent && relatedEvent.relatedEventIds.includes(id)) {
            const updatedRelatedEvent = {
              ...relatedEvent,
              relatedEventIds: relatedEvent.relatedEventIds.filter(eid => eid !== id),
              updatedAt: new Date(),
            };
            await storage.update('events', relatedEventId, updatedRelatedEvent);
          }
        } catch (error) {
          console.error(`Failed to update related event ${relatedEventId}:`, error);
        }
      }
    }

    const updatedEvent = {
      ...event,
      ...updates,
      updatedAt: new Date(),
    };

    await storage.update('events', id, updatedEvent);
    await loadEvents();
  };

  // 删除事件卡片
  const deleteEvent = async (id: string): Promise<void> => {
    const storage = getStorageAdapter();
    await storage.delete('events', id);
    await loadEvents();
  };

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    reload: loadEvents,
  };
}

