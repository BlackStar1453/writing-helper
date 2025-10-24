/**
 * 地点数据管理 Hook
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Location, Reference, StorageAdapter } from '../types';
import { getStorageAdapter, generateUUID } from '../platform-utils';

export function useLocations(novelId?: string | null) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // 初始化存储适配器
  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter;
      loadLocations();
    });
  }, [novelId]);

  /**
   * 加载所有地点(支持按novelId过滤)
   */
  const loadLocations = async () => {
    if (!storageRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let list: Location[];
      if (novelId && storageRef.current.listByNovelId) {
        list = await storageRef.current.listByNovelId('locations', novelId);
      } else {
        list = await storageRef.current.list('locations');
      }

      setLocations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建地点
   */
  const createLocation = async (data: Partial<Location>): Promise<string> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    if (!novelId) throw new Error('novelId is required to create a location');

    try {
      const newLocation = {
        ...data,
        novelId,
        relatedCharacters: data.relatedCharacters || [],
        relatedEvents: data.relatedEvents || [],
        references: []
      };

      const id = await storageRef.current.create('locations', newLocation);
      await loadLocations();
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create location';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 更新地点
   */
  const updateLocation = async (id: string, data: Partial<Location>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const existing = await storageRef.current.read('locations', id);
      const updated = { ...existing, ...data };
      await storageRef.current.update('locations', id, updated);
      await loadLocations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update location';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除地点
   */
  const deleteLocation = async (id: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      await storageRef.current.delete('locations', id);
      await loadLocations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete location';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 根据ID获取地点
   */
  const getLocationById = (id: string): Location | undefined => {
    return locations.find(l => l.id === id);
  };

  /**
   * 添加引用记录
   */
  const addReference = async (locationId: string, reference: Omit<Reference, 'id' | 'createdAt'>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const location = await storageRef.current.read('locations', locationId);
      const newReference = {
        ...reference,
        id: generateUUID(),
        createdAt: new Date()
      };

      const updatedReferences = [...(location.references || []), newReference];
      await storageRef.current.update('locations', locationId, { references: updatedReferences });
      await loadLocations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add reference';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除引用记录
   */
  const removeReference = async (locationId: string, referenceId: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const location = await storageRef.current.read('locations', locationId);
      const updatedReferences = (location.references || []).filter(r => r.id !== referenceId);
      await storageRef.current.update('locations', locationId, { references: updatedReferences });
      await loadLocations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove reference';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    locations,
    loading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
    addReference,
    removeReference,
    getLocationById,
    reload: loadLocations
  };
}

