/**
 * 事件卡片展示组件
 */

import { EventCard as EventCardType, Character, Location } from '@/lib/novel/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface EventCardProps {
  event: EventCardType;
  characters: Character[];
  locations: Location[];
  onEdit: () => void;
  onDelete: () => void;
}

export function EventCard({ event, characters, locations, onEdit, onDelete }: EventCardProps) {
  // 获取关联的人物名称
  const relatedCharacterNames = event.relatedCharacterIds
    .map(id => characters.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  // 获取关联的地点名称
  const relatedLocationNames = event.relatedLocationIds
    .map(id => locations.find(l => l.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
        <CardDescription className="line-clamp-2">{event.outline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {relatedCharacterNames && (
          <div>
            <div className="text-sm font-medium text-gray-700">参与人物:</div>
            <div className="text-sm text-gray-600">{relatedCharacterNames}</div>
          </div>
        )}
        {relatedLocationNames && (
          <div>
            <div className="text-sm font-medium text-gray-700">发生地点:</div>
            <div className="text-sm text-gray-600">{relatedLocationNames}</div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">事件流程:</div>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            {event.process.slice(0, 3).map((step) => (
              <li key={step.id} className="line-clamp-1">
                {step.description}
              </li>
            ))}
            {event.process.length > 3 && (
              <li className="text-gray-400">...还有 {event.process.length - 3} 个步骤</li>
            )}
          </ol>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          编辑
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          删除
        </Button>
      </CardFooter>
    </Card>
  );
}

