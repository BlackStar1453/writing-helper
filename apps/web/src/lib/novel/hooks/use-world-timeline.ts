/**
 * 世界时间线数据管理 Hook
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { WorldTimelineEvent, StorageAdapter } from '../types';
import { getStorageAdapter } from '../platform-utils';
import { generateUUID } from '../platform-utils';

export function useWorldTimeline(novelId?: string | null) {
  const [events, setEvents] = useState<WorldTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // 初始化存储适配器
  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter;
      loadEvents();
    });
  }, [novelId]);

  /**
   * 加载所有世界事件(支持按novelId过滤)
   */
  const loadEvents = async () => {
    if (!storageRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let list: WorldTimelineEvent[];
      if (novelId && storageRef.current.listByNovelId) {
        list = await storageRef.current.listByNovelId('worldTimeline', novelId);
      } else {
        list = await storageRef.current.list('worldTimeline');
      }

      // 按日期排序
      const sorted = list.sort((a, b) => {
        return compareDates(a.date, b.date);
      });
      setEvents(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline events');
      console.error('Failed to load timeline events:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建世界事件
   */
  const createEvent = async (data: Partial<WorldTimelineEvent>): Promise<string> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    if (!novelId) throw new Error('novelId is required to create an event');

    try {
      const newEvent = {
        ...data,
        novelId,
        relatedCharacters: data.relatedCharacters || [],
        relatedLocations: data.relatedLocations || []
      };

      const id = await storageRef.current.create('worldTimeline', newEvent);
      await loadEvents();
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 更新世界事件
   */
  const updateEvent = async (id: string, data: Partial<WorldTimelineEvent>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    
    try {
      const existing = await storageRef.current.read('worldTimeline', id);
      const updated = { ...existing, ...data };
      await storageRef.current.update('worldTimeline', id, updated);
      await loadEvents();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update event';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除世界事件
   */
  const deleteEvent = async (id: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    
    try {
      await storageRef.current.delete('worldTimeline', id);
      await loadEvents();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete event';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 根据ID获取事件
   */
  const getEventById = (id: string): WorldTimelineEvent | undefined => {
    return events.find(e => e.id === id);
  };

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    reload: loadEvents
  };
}

/**
 * 比较两个日期字符串
 * 支持精确日期(YYYY-MM-DD)和灵活描述
 */
function compareDates(a: string, b: string): number {
  // 尝试解析为日期
  const dateA = new Date(a);
  const dateB = new Date(b);
  
  // 如果都是有效日期,按日期比较
  if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
    return dateA.getTime() - dateB.getTime();
  }
  
  // 否则按字符串比较
  return a.localeCompare(b);
}

