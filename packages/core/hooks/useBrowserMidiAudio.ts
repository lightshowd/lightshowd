import * as React from 'react';
import { IOEvent } from '../IOEvent';
import { Midi } from '../Midi';
import { Logger } from '../Logger';
import type { Track } from '../Playlist';
import { getTimeString } from '../helpers';
import { io } from '../BrowserIOServer';

const logger = new Logger({ level: ['debug'] });
const midiPlayer = new Midi({ io, logger });

export const useBrowserMidiAudio = ({
  timeRef,
  durationRef,
  audioRef,
  track,
}: {
  audioRef: React.MutableRefObject<HTMLAudioElement>;
  timeRef?: React.MutableRefObject<HTMLSpanElement>;
  durationRef?: React.MutableRefObject<HTMLSpanElement>;
  track: Track;
}) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isSafari =
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome');

  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [waitForResume, setWaitForResume] = React.useState(false);
  const [trackQueued, setTrackQueued] = React.useState(false);

  React.useEffect(() => {
    if (track?.midiEncoded) {
      midiPlayer.loadDataUri(track.midiEncoded);
    }
  }, [track]);

  React.useEffect(() => {
    io.emit(IOEvent.TrackStop);
  }, [track]);

  const handleSeek = (percentage: number) => {
    if (!audioRef.current) {
      return;
    }

    const seekTime = Math.floor(duration * (percentage / 100));
    audioRef.current.pause();
    audioRef.current.currentTime = seekTime;

    audioRef.current.addEventListener(
      'playing',
      () => {
        const currentTime = audioRef.current.currentTime;
        midiPlayer.seek(currentTime);
        midiPlayer.play();

        // Recalibrate for buffering
        if (currentTime === 0) {
          setTimeout(() => {
            midiPlayer.seek(audioRef.current.currentTime);
            if (!midiPlayer.isPlaying()) {
              midiPlayer.play();
            }
          }, 1000);
        }
      },
      { once: true }
    );

    audioRef.current.play();
  };

  const handlePause = () => {
    midiPlayer.midiPlayer.pause();
    audioRef.current.pause();
  };

  const handleResume = () => {
    if (time === 0) {
      io.emit(IOEvent.TrackStart);
    }

    audioRef.current.addEventListener(
      'playing',
      () => {
        const currentTime = audioRef.current.currentTime;
        setTrackQueued(false);

        midiPlayer.seek(currentTime);
        if (!midiPlayer.isPlaying()) {
          midiPlayer.play();
        }

        // Recalibrate for buffering
        if (currentTime === 0) {
          setTimeout(() => {
            midiPlayer.seek(audioRef.current.currentTime);
            if (!midiPlayer.isPlaying()) {
              midiPlayer.play();
            }
          }, 300);
        }
      },
      { once: true }
    );
    audioRef.current.play();
  };

  React.useEffect(() => {
    const onTimeUpdate = () => {
      if (audioRef.current.seeking) {
        return;
      }
      const time = audioRef.current.currentTime;

      if (timeRef?.current) {
        timeRef.current.innerText = getTimeString(time);
      }

      if (!waitForResume) {
        setTime(time);
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        const { duration } = audioRef.current;
        setDuration(duration);
        setTime(0);

        if (durationRef?.current) {
          durationRef.current.innerText = getTimeString(duration);
        }

        if (timeRef?.current) {
          timeRef.current.innerText = getTimeString(0);
        }

        if (!isSafari || !isIOS) {
          setTimeout(() => {
            handleResume();
          }, 50);
        } else {
          setTrackQueued(true);
        }
      });

      audioRef.current.addEventListener('timeupdate', onTimeUpdate);
      audioRef.current.addEventListener('seeking', () => {}, { once: true });
    }

    return () => {
      audioRef.current.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [audioRef]);

  return {
    values: {
      time,
      duration,
      percentage: Math.ceil((time / duration) * 100),
      trackLoaded: trackQueued,
    },
    handlers: {
      seek: handleSeek,
      pause: handlePause,
      resume: handleResume,
    },
  };
};
