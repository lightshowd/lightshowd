import * as React from 'react';

import { Player as PlayerComponent } from './Player';
import { Box, IconButton } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleFilledWhite';

const BASE_COLOR = 'rgba(255, 255, 255, 0.7)';

export const PlayerContainer: React.FC<{}> = () => {
  const [togglePlayer, setTogglePlayer] = React.useState(false);

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
      <PlayerComponent
        onClose={() => setTogglePlayer(false)}
        visible={togglePlayer}
        onPlayClick={() => {
          console.log('play clicked');
        }}
      />
    </>
  );
};
