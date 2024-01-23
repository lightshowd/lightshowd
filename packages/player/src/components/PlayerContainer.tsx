import * as React from 'react';
import useSwr from 'swr';
import { Player as PlayerComponent } from './Player';
import type { Track } from '@lightshowd/core/Playlist';

const fetcher = (url) => fetch(url).then((res) => res.json());

export const PlayerContainer: React.FC<{}> = () => {
  // Fetch playlist tracks
  const { data: tracks = [], error } = useSwr('/api/playlist', fetcher);

  const [activeTrack, setActiveTrack] = React.useState<
    (Track & { paused: boolean }) | null
  >(null);

  const handlePlayTrack = (track, action?: string) => {
    fetch(
      `/api/control-center/track/load?track=${track.name}&format=midi`
    ).then(() => {
      setActiveTrack(track);
    });
  };

  return (
    <PlayerComponent
      tracks={tracks}
      activeTrack={activeTrack}
      onPlayClick={handlePlayTrack}
    />
  );
};
