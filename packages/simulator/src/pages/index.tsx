import * as React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import useSwr from 'swr';
import { mapChannels } from '@lightshowd/core/helpers';

import PianoIcon from '@mui/icons-material/Piano';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { Player } from '@lightshowd/player/components/Player';

import { Logo } from '../components/Logo';

import {
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { InfoDialog } from '../components/InfoDialog';

// @ts-ignore
const SpaceDesigner = dynamic(() => import('../components/SpaceDesigner'), {
  ssr: false,
});

const BASE_COLOR = 'rgba(255, 255, 255, 0.7)';

export default function Index() {
  const router = useRouter();

  const { data: spaces = [], error } = useSwr(
    '/api/control-center/spaces',
    (url) => fetch(url).then((res) => res.json())
  );

  const [activeSpace, setActiveSpace] = React.useState<any | null>(null);
  const [showInfo, setShowInfo] = React.useState(false);
  const [activeInput, setActiveInput] = React.useState<'midi' | 'player'>(
    'midi'
  );
  const [togglePlayer, setTogglePlayer] = React.useState(false);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    // For now pick the first space
    const spaceMatch = { ...spaces[0] };
    if (spaceMatch) {
      // @ts-ignore
      spaceMatch.mappedChannels = mapChannels(spaceMatch);
      setActiveSpace(spaceMatch);
    }
  }, [spaces]);

  return (
    <>
      {
        // @ts-ignore
        activeSpace && <SpaceDesigner input={activeInput} space={activeSpace} />
      }
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          left: { xs: 10, md: 20 },
          color: BASE_COLOR,
          width: { xs: 125, md: 150 },
        }}
      >
        <Logo />
      </Box>
      <Box sx={{ position: 'absolute', right: 25, top: 25 }}>
        <ToggleButtonGroup
          value={activeInput}
          exclusive
          onChange={(_, value: 'midi' | 'player') => {
            if (!value && activeInput === 'player') {
              setTogglePlayer(true);
              return;
            }
            if (value === 'player') {
              setTogglePlayer(true);
              setPaused(false);
            } else if (value === 'midi') {
              setPaused(true);
            }

            if (value) {
              setActiveInput(value);
            }
          }}
          aria-label="simulator input type"
        >
          <ToggleButton
            sx={{
              color: BASE_COLOR,
              border: `2px solid ${BASE_COLOR}`,
              '&:hover, &[aria-pressed=true]': {
                color: 'white',
              },
            }}
            value="player"
            aria-label="open player"
          >
            <LibraryMusicIcon />
          </ToggleButton>
          <ToggleButton
            sx={{
              color: BASE_COLOR,
              border: `2px solid ${BASE_COLOR}`,
              '&:hover, &[aria-pressed=true]': {
                color: 'white',
              },
            }}
            value="midi"
            aria-label="use midi"
          >
            <PianoIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          position: 'fixed',
          bottom: 25,
          right: 20,
        }}
      >
        <IconButton
          onClick={() => setShowInfo(true)}
          sx={{
            color: BASE_COLOR,
            border: `2px solid ${BASE_COLOR}`,
            '&:hover': {
              color: 'white',
              borderColor: 'white',
            },
          }}
          size="small"
        >
          <QuestionMarkIcon
            fontSize="small"
            sx={{ fontSize: { xs: 16, md: 20 } }}
          />
        </IconButton>
      </Box>

      <Player
        onClose={() => setTogglePlayer(false)}
        visible={togglePlayer}
        paused={paused}
        onPlayClick={() => {
          console.log('play clicked');
        }}
      />

      <InfoDialog onClose={() => setShowInfo(false)} open={showInfo} />
    </>
  );
}
