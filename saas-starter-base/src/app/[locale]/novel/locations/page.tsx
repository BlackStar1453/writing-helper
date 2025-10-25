/**
 * 地点管理页面
 */

'use client';

import React, { useState } from 'react';
import { useLocations } from '@/lib/novel/hooks/use-locations';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { LocationCard } from '@/components/novel/LocationCard';
import { LocationDialog } from '@/components/novel/LocationDialog';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { Location } from '@/lib/novel/types';
import { Plus, Loader2 } from 'lucide-react';

export default function LocationsPage() {
  const { currentNovelId } = useNovels();
  const {
    locations,
    loading,
    error,
    createLocation,
    updateLocation,
    deleteLocation
  } = useLocations(currentNovelId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const handleCreate = () => {
    setEditingLocation(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<Location>) => {
    if (editingLocation) {
      await updateLocation(editingLocation.id, data);
    } else {
      await createLocation(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个地点吗?')) {
      await deleteLocation(id);
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
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">地点管理</h1>
          <Button
            onClick={handleCreate}
            variant="outline"
            className="border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          >
            创建地点
          </Button>
        </div>

        {locations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 dark:text-gray-600 font-light mb-4">
              暂无地点
            </p>
            <Button
              onClick={handleCreate}
              variant="outline"
              className="border-gray-200 dark:border-gray-700"
            >
              创建第一个地点
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <LocationDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          location={editingLocation}
        />
      </div>
    </>
  );
}

