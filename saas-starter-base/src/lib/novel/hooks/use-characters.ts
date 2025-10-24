/**
 * 人物数据管理 Hook
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Character, CharacterRelationship, CharacterTimelineEvent, Reference, StorageAdapter } from '../types';
import { getStorageAdapter } from '../platform-utils';
import { generateUUID } from '../platform-utils';

export function useCharacters(novelId?: string | null) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // 初始化存储适配器
  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter;
      loadCharacters();
    });
  }, [novelId]); // 当novelId变化时重新加载

  /**
   * 加载所有人物(支持按novelId过滤)
   */
  const loadCharacters = async () => {
    if (!storageRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let list: Character[];
      if (novelId && storageRef.current.listByNovelId) {
        // 如果提供了novelId,按novelId过滤
        list = await storageRef.current.listByNovelId('characters', novelId);
      } else {
        // 否则加载所有人物
        list = await storageRef.current.list('characters');
      }

      setCharacters(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建人物
   */
  const createCharacter = async (data: Partial<Character>): Promise<string> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    if (!novelId) throw new Error('novelId is required to create a character');

    try {
      const newCharacter = {
        ...data,
        novelId, // 添加novelId
        basicInfo: data.basicInfo || {},
        timeline: [],
        relationships: [],
        references: []
      };

      const id = await storageRef.current.create('characters', newCharacter);
      await loadCharacters();
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create character';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 更新人物
   */
  const updateCharacter = async (id: string, data: Partial<Character>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const existing = await storageRef.current.read('characters', id);
      const updated = { ...existing, ...data };
      await storageRef.current.update('characters', id, updated);
      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update character';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除人物
   */
  const deleteCharacter = async (id: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      // 删除前先移除所有关联关系
      const character = await storageRef.current.read('characters', id);

      // 移除双向关联
      for (const rel of character.relationships || []) {
        if (rel.isBidirectional) {
          try {
            const targetCharacter = await storageRef.current.read('characters', rel.targetCharacterId);
            targetCharacter.relationships = targetCharacter.relationships.filter(
              (r: CharacterRelationship) => r.targetCharacterId !== id
            );
            await storageRef.current.update('characters', rel.targetCharacterId, targetCharacter);
          } catch (err) {
            console.warn(`Failed to remove reverse relationship for ${rel.targetCharacterId}:`, err);
          }
        }
      }

      await storageRef.current.delete('characters', id);
      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete character';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 添加时间线事件
   */
  const addTimelineEvent = async (
    characterId: string,
    event: Omit<CharacterTimelineEvent, 'id'>
  ): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const character = await storageRef.current.read('characters', characterId);
      const newEvent = {
        ...event,
        id: generateUUID()
      };

      character.timeline = [...(character.timeline || []), newEvent];
      await storageRef.current.update('characters', characterId, character);
      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add timeline event';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 添加关系(支持双向关联)
   */
  const addRelationship = async (
    characterId: string,
    relationship: Omit<CharacterRelationship, 'id'>
  ): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const character = await storageRef.current.read('characters', characterId);
      const newRelationship = {
        ...relationship,
        id: generateUUID()
      };

      // 添加关系到当前人物
      character.relationships = [...(character.relationships || []), newRelationship];
      await storageRef.current.update('characters', characterId, character);

      // 如果是双向关联,添加反向关系
      if (relationship.isBidirectional) {
        const targetCharacter = await storageRef.current.read('characters', relationship.targetCharacterId);
        const reverseRelationship: CharacterRelationship = {
          id: generateUUID(),
          targetCharacterId: characterId,
          relationshipType: relationship.relationshipType,
          description: relationship.description,
          isBidirectional: true
        };

        targetCharacter.relationships = [...(targetCharacter.relationships || []), reverseRelationship];
        await storageRef.current.update('characters', relationship.targetCharacterId, targetCharacter);
      }

      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add relationship';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除关系
   */
  const removeRelationship = async (
    characterId: string,
    relationshipId: string
  ): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const character = await storageRef.current.read('characters', characterId);
      const relationship = character.relationships.find((r: CharacterRelationship) => r.id === relationshipId);

      if (!relationship) {
        throw new Error('Relationship not found');
      }

      // 移除当前人物的关系
      character.relationships = character.relationships.filter(
        (r: CharacterRelationship) => r.id !== relationshipId
      );
      await storageRef.current.update('characters', characterId, character);

      // 如果是双向关联,移除反向关系
      if (relationship.isBidirectional) {
        try {
          const targetCharacter = await storageRef.current.read('characters', relationship.targetCharacterId);
          targetCharacter.relationships = targetCharacter.relationships.filter(
            (r: CharacterRelationship) => r.targetCharacterId !== characterId
          );
          await storageRef.current.update('characters', relationship.targetCharacterId, targetCharacter);
        } catch (err) {
          console.warn(`Failed to remove reverse relationship:`, err);
        }
      }

      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove relationship';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 根据ID获取人物
   */
  const getCharacterById = (id: string): Character | undefined => {
    return characters.find(c => c.id === id);
  };

  /**
   * 添加引用记录
   */
  const addReference = async (characterId: string, reference: Omit<Reference, 'id' | 'createdAt'>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const character = await storageRef.current.read('characters', characterId);
      const newReference = {
        ...reference,
        id: generateUUID(),
        createdAt: new Date()
      };

      const updatedReferences = [...(character.references || []), newReference];
      await storageRef.current.update('characters', characterId, { references: updatedReferences });
      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add reference';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除引用记录
   */
  const removeReference = async (characterId: string, referenceId: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      const character = await storageRef.current.read('characters', characterId);
      const updatedReferences = (character.references || []).filter(r => r.id !== referenceId);
      await storageRef.current.update('characters', characterId, { references: updatedReferences });
      await loadCharacters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove reference';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // 初始加载
  useEffect(() => {
    loadCharacters();
  }, []);

  return {
    characters,
    loading,
    error,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    addTimelineEvent,
    addRelationship,
    removeRelationship,
    addReference,
    removeReference,
    getCharacterById,
    reload: loadCharacters
  };
}

