import * as React from 'react';
import { IOEvent } from '../IOEvent';
import type { Track } from '../Playlist';
import { io } from 'socket.io-client';
import { getTimeString } from '../helpers';
import { throttle } from 'lodash';

let socketClient;

export const useIOPlayerEvents = ({
  timeRef,
  durationRef,
  audioRef,
  track,
}: {
  timeRef: React.MutableRefObject<HTMLSpanElement>;
  durationRef: React.MutableRefObject<HTMLSpanElement>;
  audioRef: React.MutableRefObject<HTMLAudioElement>;
  track: Track;
}) => {
  if (!socketClient) {
    socketClient = io({ auth: { id: 'player' } });
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isSafari =
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome');

  const socketRef = React.useRef(socketClient);

  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [waitForResume, setWaitForResume] = React.useState(false);
  const [trackQueued, setTrackQueued] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState<Track>(track);

  React.useEffect(() => {
    if (currentTrack && track && currentTrack.name !== track.name) {
      console.debug('emit track stop because track changed.');
      socketRef.current.emit(IOEvent.TrackStop);
    }
    setCurrentTrack(track);
  }, [track]);

  window.addEventListener('beforeunload', () => {
    console.debug('emit track stop on beforeunload');
    socketRef.current.emit(IOEvent.TrackStop);
  });

  const handleSeek = (percentage: number) => {
    const seekTime = Math.floor(duration * (percentage / 100));
    audioRef.current.pause();
    audioRef.current.currentTime = seekTime;

    audioRef.current.addEventListener(
      'playing',
      () => {
        if (audioRef.current.paused) {
          return;
        }
        socketRef.current.emit(IOEvent.TrackSeek, audioRef.current.currentTime);
      },
      { once: true }
    );

    // Need delay or else midi will be early
    setTimeout(() => {
      audioRef.current.play();
    }, 200);
  };

  const handlePause = () => {
    socketRef.current.emit(IOEvent.TrackPause);
    audioRef.current.pause();
  };

  const bufferSeek = () => {
    setTimeout(() => {
      if (audioRef.current.currentTime === 0) {
        bufferSeek();
        return;
      }
      socketRef.current.emit(IOEvent.TrackSeek, audioRef.current.currentTime);
    }, 100);
  };

  const handleResume = () => {
    if (time === 0) {
      socketRef.current.emit(IOEvent.TrackStart);
    }

    audioRef.current.addEventListener(
      'playing',
      () => {
        const currentTime = audioRef.current.currentTime;
        setTrackQueued(false);

        socketRef.current.emit(
          currentTime === 0 ? IOEvent.TrackPlay : IOEvent.TrackSeek,
          currentTime
        );

        // Recalibrate for buffering
        if (currentTime === 0) {
          bufferSeek();
        }
      },
      { once: true }
    );

    audioRef.current.play();
  };

  const onTimeUpdate = throttle(() => {
    if (audioRef.current.seeking) {
      return;
    }
    const time = audioRef.current.currentTime;
    timeRef.current.innerText = getTimeString(time);

    if (!waitForResume) {
      setTime(time);
    }
  }, 1000);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        const { duration } = audioRef.current;
        setDuration(duration);
        setTime(0);
        durationRef.current.innerText = getTimeString(duration);
        timeRef.current.innerText = getTimeString(0);

        if (!isSafari && !isIOS) {
          setTimeout(() => {
            handleResume();
          }, 50);
        } else {
          setTrackQueued(true);
        }
      });

      audioRef.current.addEventListener('ended', () => {
        setTime(0);
        timeRef.current.innerText = getTimeString(0);
        socketRef.current.emit(IOEvent.TrackStop);
        audioRef.current.currentTime = 0;
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
      percentage: duration ? Math.ceil((time / duration) * 100) : 0,
      trackLoaded: trackQueued,
    },
    handlers: { seek: handleSeek, pause: handlePause, resume: handleResume },
  };
};
