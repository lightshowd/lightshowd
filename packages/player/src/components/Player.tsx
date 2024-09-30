import * as React from 'react';
import useSwr from 'swr';

import {
  Drawer,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';

import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleFilledWhite';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

import type { Track } from '@lightshowd/core/Playlist';
import { PlayerControls } from './PlayerControls';

interface PlayerProps {
  onPlayClick: (track: Track) => void;
  onClose: () => void;
  visible?: boolean;
  paused?: boolean;
}

const fetcher = (url) => fetch(url).then((res) => res.json());

export const Player: React.FC<PlayerProps> = ({
  onPlayClick,
  onClose,
  visible = true,
  paused = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(visible);
  const [activeTrack, setActiveTrack] = React.useState<
    (Track & { paused: boolean }) | null
  >(null);

  const { data: tracks = [], error } = useSwr(
    '/api/playlist?format=mp3',
    fetcher
  );

  const handlePlayTrack = (track, action?: string) => {
    fetch(
      `/api/control-center/track/load?track=${track.name}&format=midi`
    ).then(() => {
      setActiveTrack(track);
    });
  };

  React.useEffect(() => {
    setIsLoading(false);
  }, [activeTrack]);

  React.useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  return (
    <Drawer
      anchor="right"
      open={isVisible}
      keepMounted={true}
      onClose={() => {
        onClose();
      }}
    >
      <Stack sx={{ width: 300, flex: 1 }}>
        <Stack sx={{ py: 1 }} direction="column">
          {tracks.map((track) => (
            <Stack
              key={track.file}
              spacing={1}
              direction="row"
              alignItems="center"
              sx={{ px: 1 }}
            >
              <IconButton
                disabled={activeTrack?.file === track.file}
                onClickCapture={() => {
                  setIsLoading(true);
                  handlePlayTrack(track);
                }}
              >
                {activeTrack?.file === track.file ? (
                  <GraphicEqIcon />
                ) : (
                  <PlayCircleOutlineIcon />
                )}
              </IconButton>
              {isLoading && (
                <CircularProgress
                  size={28}
                  sx={{
                    left: 6,

                    position: 'absolute',
                    zIndex: 1,
                  }}
                />
              )}
              <Typography variant="subtitle2">
                {track.name} / {track.artist}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack
          spacing={1}
          justifyContent="flex-end"
          alignItems="stretch"
          sx={{ flex: 1 }}
        >
          <Divider />
          <PlayerControls track={activeTrack} paused={paused} />
        </Stack>
      </Stack>
    </Drawer>
  );
};
