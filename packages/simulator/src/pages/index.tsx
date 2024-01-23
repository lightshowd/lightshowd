import * as React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import useSwr from 'swr';
import { mapChannels } from '@lightshowd/core/helpers';

import { Logo } from '../components/Logo';

import { Box, IconButton } from '@mui/material';

import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { InfoDialog } from '../components/InfoDialog';

// @ts-ignore
const SpaceDesigner = dynamic(() => import('../components/SpaceDesigner'), {
  ssr: false,
});

const BASE_COLOR = 'rgba(255, 255, 255, 0.7)';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Index() {
  const router = useRouter();

  const { data: spaces = [], error } = useSwr(
    '/api/control-center/spaces',
    fetcher
  );

  const [activeSpace, setActiveSpace] = React.useState<any | null>(null);
  const [showInfo, setShowInfo] = React.useState(false);

  React.useEffect(() => {
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
        activeSpace && <SpaceDesigner space={activeSpace} />
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

      <InfoDialog onClose={() => setShowInfo(false)} open={showInfo} />
    </>
  );
}
