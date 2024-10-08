import * as React from 'react';
import { IOEvent } from '../IOEvent';
import type { Track } from '../Playlist';
import { io } from 'socket.io-client';
import { getTimeString } from '../helpers';

let socketClient;

const playerOffset = 0;

export const useIOListenerEvents = ({
  timeRef,
  durationRef,
  diagnosticRef,
  audioRef,
  trackInfoRef,
  track,
}: {
  audioRef: React.MutableRefObject<HTMLAudioElement>;
  timeRef?: React.MutableRefObject<HTMLSpanElement>;
  durationRef?: React.MutableRefObject<HTMLSpanElement>;
  diagnosticRef?: React.MutableRefObject<HTMLDivElement>;
  trackInfoRef?: React.MutableRefObject<HTMLDivElement>;
  track?: Track;
}) => {
  if (!socketClient) {
    socketClient = io({ auth: { id: 'player' } });
  }

  const [isIOS, setIsIOS] = React.useState(false);
  const [isSafari, setIsSafari] = React.useState(false);

  const isMuted = React.useRef(true);
  const isBluetooth = React.useRef(false);
  const userInteracted = React.useRef(false);

  React.useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator?.userAgent));
    setIsSafari(
      navigator?.userAgent.includes('Safari') &&
        !navigator?.userAgent.includes('Chrome')
    );
  }, []);

  const socketRef = React.useRef(socketClient);

  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [waitForResume, setWaitForResume] = React.useState(false);
  const [trackQueued, setTrackQueued] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState<Track | null>(
    track ?? null
  );
  const startDateValue = React.useRef<number>(0);
  const [inProgressTrack, setInProgressTrack] =
    React.useState<Partial<Track> | null>(null);

  const loadInProgressTrack = React.useCallback(
    ({ name, file, startTime }) => {
      audioRef.current.src = `/audio/${file}.mp3`;
      startDateValue.current = new Date(startTime).valueOf();
      setInProgressTrack({ name, file });
      if (trackInfoRef?.current) {
        queueMicrotask(() => {
          trackInfoRef.current.innerText = `Now Playing\n${name ?? file}`;
        });
      }
    },
    [audioRef]
  );

  React.useEffect(() => {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.on(IOEvent.TrackStatus, loadInProgressTrack);
    socketRef.current.on(IOEvent.TrackStart, (file, startTime) => {
      loadInProgressTrack({ name: file, file, startTime });
    });
    socketRef.current.on(IOEvent.TrackEnd, () => {
      audioRef.current.pause();
      setInProgressTrack(null);
      if (trackInfoRef?.current) {
        trackInfoRef.current.innerText = '';
      }
      if (timeRef?.current) {
        timeRef.current.innerText = getTimeString(0);
      }
    });
    socketRef.current.emit(IOEvent.TrackStatus);

    return () => {
      socketRef.current.off(IOEvent.TrackStatus, loadInProgressTrack);
    };
  }, [socketRef, trackInfoRef]);

  React.useEffect(() => {
    if (track) {
      setCurrentTrack(track);
    }
  }, [track]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', handleTrackLoaded);

      audioRef.current.addEventListener('ended', () => {
        setTime(0);
        if (timeRef?.current) {
          timeRef.current.innerText = getTimeString(0);
        }
      });

      audioRef.current.addEventListener('timeupdate', onTimeUpdate);
    }

    return () => {
      audioRef.current.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current.removeEventListener('loadedmetadata', handleTrackLoaded);
    };
  }, [audioRef]);

  const handlePause = React.useCallback(() => {
    audioRef.current.pause();
  }, [audioRef]);

  const handleDiff = React.useCallback(
    ({ timeAtResume, timeAtPlaying, currentTime }) => {
      const latestTime = audioRef.current.currentTime;
      const timeAtLatestCheck =
        (new Date().valueOf() - startDateValue.current) / 1000;

      let diff = timeAtLatestCheck - latestTime;

      let adjDiff = isBluetooth.current ? 0.2 : 0.3;

      audioRef.current.currentTime = timeAtLatestCheck + adjDiff;

      setTimeout(() => {
        let innerText = `Time at Resume: ${timeAtResume}\n`;

        innerText += `Time at Playing: ${timeAtPlaying}\n`;
        innerText += `Current Time: ${currentTime}\n`;
        innerText += `Time at Latest Check: ${timeAtLatestCheck}\n`;
        innerText += `Latest Time: ${latestTime}\n`;
        innerText += `Diff: ${diff}\n`;
        innerText += `Adj diff: ${adjDiff}\n`;
        innerText += `Is bluetooth: ${isBluetooth.current}\n`;

        if (diagnosticRef?.current) {
          diagnosticRef.current.innerText = innerText;
        }
      }, 100);
    },

    [audioRef, diagnosticRef, time]
  );

  const handleResume = React.useCallback(
    (clickTime?: number) => {
      const resumeTime = new Date().valueOf() + playerOffset;
      let timeAtResume = 0;

      if (startDateValue.current) {
        timeAtResume = (resumeTime - startDateValue.current) / 1000;
        audioRef.current.currentTime = timeAtResume;
      }

      audioRef.current.addEventListener(
        'playing',
        () => {
          const currentTime = audioRef.current.currentTime;
          const timeAtPlaying =
            (new Date().valueOf() - startDateValue.current) / 1000;

          setTimeout(
            () => handleDiff({ timeAtResume, timeAtPlaying, currentTime }),
            500
          );

          setTimeout(() => {
            setTrackQueued(false);
          }, 1000);
        },
        { once: true }
      );

      audioRef.current.play();
    },
    [audioRef, diagnosticRef, handleDiff, time]
  );

  const onTimeUpdate = React.useCallback(() => {
    // throttle(() => {
    if (!timeRef?.current) {
      return;
    }

    if (audioRef.current.seeking) {
      return;
    }

    const currTime = audioRef.current.currentTime;
    timeRef.current.innerText = getTimeString(currTime);
  }, [audioRef, timeRef, waitForResume]);

  const handleTrackLoaded = React.useCallback(() => {
    const { duration } = audioRef.current;

    setDuration(duration);

    setTime(0);

    if (durationRef?.current) {
      durationRef.current.innerText = getTimeString(duration);
    }
    if (timeRef?.current) {
      timeRef.current.innerText = getTimeString(0);
    }

    if (userInteracted.current && startDateValue.current) {
      handleResume();
    } else {
      userInteracted.current = true;
      setTrackQueued(true);
    }
  }, [
    audioRef,
    durationRef,
    timeRef,
    // startDateValue,
    userInteracted,
    handleResume,
  ]);

  const handleSeek = React.useCallback(
    (percentage: number) => {
      const seekTime = Math.floor(duration * (percentage / 100));
      audioRef.current.pause();
      audioRef.current.currentTime = seekTime;

      audioRef.current.addEventListener(
        'playing',
        () => {
          if (audioRef.current.paused) {
            return;
          }
          socketRef.current.emit(
            IOEvent.TrackSeek,
            audioRef.current.currentTime
          );
        },
        { once: true }
      );

      // Need delay or else midi will be early
      setTimeout(() => {
        audioRef.current.play();
      }, 200);
    },
    [audioRef, duration]
  );

  const loadAudio = React.useCallback(() => {
    audioRef.current.load();
    userInteracted.current = true;
  }, []);

  return {
    values: {
      time,
      duration,
      percentage: duration ? Math.ceil((time / duration) * 100) : 0,
      trackLoaded: trackQueued,
      inProgressTrack,
    },
    handlers: {
      seek: handleSeek,
      pause: handlePause,
      resume: handleResume,
      loadAudio,
    },
    setIsBluetooth: (value: boolean) => {
      isBluetooth.current = value;
    },
  };
};
