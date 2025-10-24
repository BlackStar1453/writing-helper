import { useState, useEffect } from 'react';
import { BoosterOption, SharePlatform } from '@/lib/db/schema';

interface BoosterConfig {
  boosterOptions: BoosterOption[];
  sharePlatforms: SharePlatform[];
}

export function useBoosterConfig() {
  const [config, setConfig] = useState<BoosterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/booster-config');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
          setError('Failed to fetch booster config');
        }
      } catch (err) {
        setError('Failed to fetch booster config');
        console.error('Error fetching booster config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}
