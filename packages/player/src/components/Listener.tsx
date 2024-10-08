'use client';

import * as React from 'react';

import {
  Stack,
  Typography,
  IconButton,
  FormControlLabel,
  styled,
  Switch,
  Button,
  Snackbar,
} from '@mui/material';
import { useIOListenerEvents } from '@lightshowd/core/hooks';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import InfoIcon from '@mui/icons-material/Info';

const StyledStack = styled(Stack)({
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100vh',
});

const DiagnosticsButton = styled(Button)({
  position: 'absolute',
  bottom: 30,
  right: 30,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const Listener: React.FC = () => {
  const timeRef = React.useRef<HTMLSpanElement | null>(null);
  const durationRef = React.useRef<HTMLSpanElement | null>(null);
  const diagnosticRef = React.useRef<HTMLDivElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const trackInfoRef = React.useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(false);

  const {
    values: { trackLoaded, inProgressTrack },
    handlers,
    setIsBluetooth,
  } = useIOListenerEvents({
    timeRef,
    durationRef,
    audioRef,
    diagnosticRef,
    trackInfoRef,
  });

  const handleAudioPlaying = React.useCallback(() => {
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleAudioPause = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleAudioEnd = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const isTrackLoaded = inProgressTrack;

  const handlePlayPauseClick = React.useCallback(() => {
    if (!isAudioEnabled && !isTrackLoaded) {
      setIsAudioEnabled(true);
      handlers.loadAudio();
      return;
    }
    if (!isAudioEnabled) {
      setIsAudioEnabled(true);
    }
    if (isPlaying) {
      handlers.pause();
    } else {
      handlers.resume();
    }
  }, [isPlaying, isAudioEnabled, isTrackLoaded, handlers]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('playing', handleAudioPlaying);
      audioRef.current.addEventListener('pause', handleAudioPause);
      audioRef.current.addEventListener('ended', handleAudioEnd);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('playing', handleAudioPlaying);
        audioRef.current.removeEventListener('pause', handleAudioPause);
        audioRef.current.removeEventListener('ended', handleAudioEnd);
      }
    };
  }, [audioRef]);

  return (
    <>
      <audio
        ref={audioRef}
        playsInline={true}
        // autoPlay={true}

        preload="auto"
      />
      <StyledStack direction="column" spacing={4}>
        <IconButton
          disabled={!isTrackLoaded && isAudioEnabled && !isPlaying}
          size="large"
          aria-label="play"
          onMouseDown={handlePlayPauseClick}
        >
          {!isTrackLoaded ? (
            isAudioEnabled ? (
              <VolumeUpIcon sx={{ fontSize: '3rem' }} />
            ) : (
              <VolumeOffIcon sx={{ fontSize: '3rem' }} />
            )
          ) : isPlaying ? (
            <VolumeUpIcon sx={{ fontSize: '3rem' }} />
          ) : (
            <VolumeOffIcon sx={{ fontSize: '3rem' }} />
          )}
        </IconButton>
        <Typography
          sx={{ whiteSpace: 'pre', textAlign: 'center' }}
          component="div"
          ref={trackInfoRef}
        ></Typography>
        <Typography ref={timeRef} />
        <FormControlLabel
          control={
            <Switch
              disabled={isPlaying}
              onChange={(_, checked) => setIsBluetooth(checked)}
            />
          }
          label="Bluetooth?"
        />
        <Typography
          sx={{ whiteSpace: 'pre', display: 'none' }}
          component="div"
          ref={diagnosticRef}
        >
          stats
        </Typography>

        <Snackbar
          open={trackLoaded}
          message="Track loaded. Press the play button"
        />
      </StyledStack>
      <DiagnosticsButton
        size="small"
        variant="text"
        onClick={() => {
          const isVisible = diagnosticRef.current?.style.display === 'block';
          diagnosticRef.current!.style.display = isVisible ? 'none' : 'block';
        }}
      >
        Diagnostics <InfoIcon />
      </DiagnosticsButton>
    </>
  );
};
