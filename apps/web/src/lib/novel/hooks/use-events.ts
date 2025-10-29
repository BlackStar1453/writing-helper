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
    relatedLocationIds: string[]
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
    };

    const storage = getStorageAdapter();
    const id = await storage.create('events', newEvent);
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
    }
  ): Promise<void> => {
    const storage = getStorageAdapter();
    const event = await storage.read('events', id) as EventCard;
    if (!event) {
      throw new Error('Event not found');
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

