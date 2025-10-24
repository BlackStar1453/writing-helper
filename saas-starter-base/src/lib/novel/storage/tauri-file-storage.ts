/**
 * Tauri 文件存储实现
 */

import { StorageAdapter } from '../types';
import { generateUUID } from '../platform-utils';

export class TauriFileStorage implements StorageAdapter {
  private basePath = 'novel-project';

  /**
   * 检查是否在 Tauri 环境中
   */
  private checkTauriEnvironment() {
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      throw new Error('TauriFileStorage can only be used in Tauri environment');
    }
  }

  /**
   * 获取文件路径
   */
  private getFilePath(collection: string, id: string): string {
    return `${this.basePath}/${collection}/${id}.json`;
  }

  async create(collection: string, data: any): Promise<string> {
    this.checkTauriEnvironment();

    // 添加元数据
    data.id = generateUUID();
    data.createdAt = new Date();
    data.updatedAt = new Date();

    try {
      // 动态导入 Tauri API
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = this.getFilePath(collection, data.id);
      
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
      return data.id;
    } catch (error) {
      throw new Error(`Failed to create data in ${collection}: ${error}`);
    }
  }

  async read(collection: string, id: string): Promise<any> {
    this.checkTauriEnvironment();

    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = this.getFilePath(collection, id);
      
      const content = await readTextFile(filePath);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read data from ${collection}: ${error}`);
    }
  }

  async update(collection: string, id: string, data: any): Promise<void> {
    this.checkTauriEnvironment();

    // 更新时间戳
    data.updatedAt = new Date();

    try {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = this.getFilePath(collection, id);
      
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to update data in ${collection}: ${error}`);
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    this.checkTauriEnvironment();

    try {
      const { remove } = await import('@tauri-apps/plugin-fs');
      const filePath = this.getFilePath(collection, id);
      
      await remove(filePath);
    } catch (error) {
      throw new Error(`Failed to delete data from ${collection}: ${error}`);
    }
  }

  async list(collection: string): Promise<any[]> {
    this.checkTauriEnvironment();

    try {
      const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
      const dirPath = `${this.basePath}/${collection}`;
      
      const entries = await readDir(dirPath);
      const results: any[] = [];

      for (const entry of entries) {
        if (entry.name && entry.name.endsWith('.json')) {
          const content = await readTextFile(`${dirPath}/${entry.name}`);
          results.push(JSON.parse(content));
        }
      }

      return results;
    } catch (error) {
      // 如果目录不存在,返回空数组
      if ((error as any)?.message?.includes('No such file or directory')) {
        return [];
      }
      throw new Error(`Failed to list data from ${collection}: ${error}`);
    }
  }
}

