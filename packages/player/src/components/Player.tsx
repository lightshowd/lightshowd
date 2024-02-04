import * as React from 'react';

import {
  Box,
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

const BASE_COLOR = 'rgba(255, 255, 255, 0.7)';

interface PlayerProps {
  tracks: Track[];
  activeTrack: Track;
  onPlayClick: (track: Track) => void;
  visible?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  tracks,
  activeTrack,
  onPlayClick,
  visible = true,
}) => {
  const [togglePlayer, setTogglePlayer] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(false);
  }, [activeTrack]);

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }

      setTogglePlayer(open);
    };

  return (
    <>
      <Box sx={{ position: 'absolute', right: 25, top: 25 }}>
        <IconButton
          sx={{
            color: BASE_COLOR,
            border: `2px solid ${BASE_COLOR}`,
            '&:hover': {
              color: 'white',
              borderColor: 'white',
            },
          }}
          size="small"
          aria-label="openplayer"
          onClick={() => setTogglePlayer(true)}
        >
          <PlayCircleOutlineIcon sx={{ fontSize: { xs: 16, md: 20 } }} />
        </IconButton>
      </Box>
      <Drawer
        anchor="right"
        open={togglePlayer}
        keepMounted={true}
        onClose={() => setTogglePlayer(false)}
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
                    onPlayClick(track);
                  }}
                >
                  {activeTrack?.file === track.file ? (
                    <GraphicEqIcon htmlColor="green" />
                  ) : (
                    <PlayCircleOutlineIcon />
                  )}
                </IconButton>
                {isLoading && (
                  <CircularProgress
                    size={28}
                    sx={{
                      left: 6,
                      color: 'green',
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
            <PlayerControls track={activeTrack} />
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
};
