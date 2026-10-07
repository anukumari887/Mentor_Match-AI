import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Camera,
  CameraOff,
  CheckCircle2,
  Mic,
  MicOff,
  RefreshCw,
  Sliders,
  Volume2
} from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Avatar from './Avatar';
import { useAuth } from '../contexts/AuthContext';

export function getMediaErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Camera or microphone is blocked. Click the lock icon in the address bar, allow Camera and Microphone, then press Try again.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera or microphone found. Connect one and press Try again.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'AbortError') {
    return 'Your camera or microphone is being used by another app or browser tab. Close it and try again.';
  }
  if (error?.name === 'OverconstrainedError') {
    return 'The requested video settings are not supported by your camera.';
  }
  if (
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'The camera needs a secure (https) connection.';
  }
  return 'Your camera or microphone could not be started. Check the device and try again.';
}

export default function CameraMicCheckCard() {
  const { user } = useAuth();

  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [cameraOff, setCameraOff] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Device lists
  const [devices, setDevices] = useState({ cameras: [], mics: [], speakers: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  // Desktop notifications state
  const [desktopNotifsEnabled, setDesktopNotifsEnabled] = useState(() => {
    try {
      return localStorage.getItem('mm_desktop_notifications') === 'true';
    } catch {
      return false;
    }
  });
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioAnimRef = useRef(null);

  // Stop all media tracks, close audio context, and clear animation frames
  const stopAllMedia = () => {
    if (audioAnimRef.current) {
      cancelAnimationFrame(audioAnimRef.current);
      audioAnimRef.current = null;
    }

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch {}
      audioSourceRef.current = null;
    }

    if (audioAnalyserRef.current) {
      try {
        audioAnalyserRef.current.disconnect();
      } catch {}
      audioAnalyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setAudioLevel(0);
  };

  // Clean up on component unmount and pagehide / beforeunload
  useEffect(() => {
    const handlePageHide = () => stopAllMedia();
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      stopAllMedia();
    };
  }, []);

  // Synchronize media stream with video element whenever preview state or camera toggles
  useEffect(() => {
    if (testing && !cameraOff && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.muted = true;
      try {
        const playPromise = videoRef.current.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch {}
    }
  }, [testing, cameraOff]);

  // Setup Audio Analyser for microphone meter
  const setupAudioAnalyser = (stream) => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      setAudioLevel(0);
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      audioAnalyserRef.current = analyser;
      audioSourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!audioAnalyserRef.current) return;
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        audioAnimRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {}
  };

  // Refresh available devices list
  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter((d) => d.kind === 'videoinput');
      const mics = allDevices.filter((d) => d.kind === 'audioinput');
      const speakers = allDevices.filter((d) => d.kind === 'audiooutput');
      setDevices({ cameras, mics, speakers });

      if (cameras.length && !selectedCamera) setSelectedCamera(cameras[0].deviceId);
      if (mics.length && !selectedMic) setSelectedMic(mics[0].deviceId);
      if (speakers.length && !selectedSpeaker) setSelectedSpeaker(speakers[0].deviceId);
    } catch {}
  };

  // Start media test ONLY on user explicit click
  const startTest = async (camId = selectedCamera, micId = selectedMic) => {
    setLoading(true);
    setMediaError('');
    stopAllMedia();

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setMediaError('The camera needs a secure (https) connection.');
      setLoading(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Camera and microphone testing requires a supported browser.');
      setLoading(false);
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { exact: camId } } : true,
          audio: micId ? { deviceId: { exact: micId } } : true
        });
      } catch (initialErr) {
        if (initialErr?.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          throw initialErr;
        }
      }

      streamRef.current = stream;
      setTesting(true);
      setCameraOff(false);
      setMuted(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          const p = videoRef.current.play?.();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {}
      }

      setupAudioAnalyser(stream);
      await refreshDevices();
    } catch (err) {
      setMediaError(getMediaErrorMessage(err));
      setTesting(false);
    } finally {
      setLoading(false);
    }
  };

  const stopTest = () => {
    stopAllMedia();
    setTesting(false);
    setCameraOff(false);
    setMuted(false);
  };

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    const nextState = !cameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !nextState;
    });
    setCameraOff(nextState);
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    const nextState = !muted;
    audioTracks.forEach((track) => {
      track.enabled = !nextState;
    });
    setMuted(nextState);
  };

  const handleCameraChange = async (newCamId) => {
    setSelectedCamera(newCamId);
    if (testing) {
      await startTest(newCamId, selectedMic);
    }
  };

  const handleMicChange = async (newMicId) => {
    setSelectedMic(newMicId);
    if (testing) {
      await startTest(selectedCamera, newMicId);
    }
  };

  const handleSpeakerChange = async (newSpeakerId) => {
    setSelectedSpeaker(newSpeakerId);
    if (videoRef.current && typeof videoRef.current.setSinkId === 'function') {
      try {
        await videoRef.current.setSinkId(newSpeakerId);
      } catch {}
    }
  };

  // Turn on desktop notifications
  const handleToggleDesktopNotifs = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const next = !desktopNotifsEnabled;
      setDesktopNotifsEnabled(next);
      try {
        localStorage.setItem('mm_desktop_notifications', String(next));
      } catch {}
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        setDesktopNotifsEnabled(true);
        try {
          localStorage.setItem('mm_desktop_notifications', 'true');
        } catch {}
      }
    } catch {}
  };

  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-accent" aria-hidden="true" />
          <h2 className="font-serif text-lg font-semibold text-ink">Camera and microphone</h2>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-xl mb-4">
        Test your audio and video before upcoming sessions so everything runs smoothly.
      </p>

      {/* Media Error Alert */}
      {mediaError && (
        <div role="alert" className="mb-4 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{mediaError}</p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startTest()}
                  className="text-xs"
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!testing ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="primary"
            onClick={() => startTest()}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
            <span>{loading ? 'Starting preview...' : 'Test camera and microphone'}</span>
          </Button>

          <p className="text-[11px] text-ink-muted">
            Your browser will ask for camera and microphone access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Live Video Preview Box */}
          <div className="relative aspect-video w-full max-w-md rounded-lg bg-surface-inset border border-border overflow-hidden shadow-inner flex items-center justify-center">
            {cameraOff ? (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <Avatar name={user?.name || 'You'} size="lg" className="mb-2" />
                <span className="text-xs font-medium text-ink-muted">Camera is off</span>
              </div>
            ) : (
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && !cameraOff) {
                    if (el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                    }
                    el.muted = true;
                    try {
                      const p = el.play?.();
                      if (p && typeof p.catch === 'function') {
                        p.catch(() => {});
                      }
                    } catch {}
                  }
                }}
                autoPlay
                playsInline
                muted
                aria-label="Live camera preview"
                className="w-full h-full object-cover mirror-mode"
                style={{ transform: 'scaleX(-1)' }}
              />
            )}

            {/* Live indicators overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Preview active</span>
            </div>
          </div>

          {/* Microphone Audio Level Bar */}
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                {muted ? <MicOff size={13} className="text-danger" /> : <Mic size={13} className="text-accent" />}
                <span>Microphone level</span>
              </span>
              <span className="font-mono text-[11px]">{muted ? 'Muted' : `${audioLevel}%`}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-raised border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  muted ? 'bg-danger/40 w-0' : audioLevel > 70 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: muted ? '0%' : `${audioLevel}%` }}
              />
            </div>
          </div>

          {/* Device pickers */}
          <div className="max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {devices.cameras.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1" htmlFor="settings-camera-select">
                  Camera
                </label>
                <select
                  id="settings-camera-select"
                  aria-label="Select camera"
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  onChange={(e) => handleCameraChange(e.target.value)}
                  value={selectedCamera}
                >
                  {devices.cameras.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {devices.mics.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1" htmlFor="settings-mic-select">
                  Microphone
                </label>
                <select
                  id="settings-mic-select"
                  aria-label="Select microphone"
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  onChange={(e) => handleMicChange(e.target.value)}
                  value={selectedMic}
                >
                  {devices.mics.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {devices.speakers.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-ink-muted mb-1" htmlFor="settings-speaker-select">
                  Speaker
                </label>
                <select
                  id="settings-speaker-select"
                  aria-label="Select speaker"
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  onChange={(e) => handleSpeakerChange(e.target.value)}
                  value={selectedSpeaker}
                >
                  {devices.speakers.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speaker ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Controls: Toggles & Stop Button */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant={cameraOff ? 'danger' : 'secondary'}
              size="sm"
              aria-pressed={!cameraOff}
              onClick={toggleCamera}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              {cameraOff ? <CameraOff size={14} /> : <Camera size={14} />}
              <span>{cameraOff ? 'Turn camera on' : 'Turn camera off'}</span>
            </Button>

            <Button
              type="button"
              variant={muted ? 'danger' : 'secondary'}
              size="sm"
              aria-pressed={!muted}
              onClick={toggleMic}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{muted ? 'Unmute microphone' : 'Mute microphone'}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={stopTest}
              className="text-xs text-ink font-semibold"
            >
              Stop test
            </Button>
          </div>

          {/* Privacy line */}
          <p className="text-[11px] text-ink-muted italic pt-1">
            Nothing is recorded or saved.
          </p>
        </div>
      )}

      {/* Optional Desktop Notifications Toggle */}
      <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="block text-xs font-semibold text-ink">Desktop message notifications</span>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Receive desktop notifications when new chat messages arrive while the tab is in the background.
          </p>
        </div>
        <Button
          type="button"
          variant={desktopNotifsEnabled ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleToggleDesktopNotifs}
          className="self-start sm:self-auto text-xs shrink-0"
        >
          <Bell size={13} className="mr-1.5" />
          <span>{desktopNotifsEnabled ? 'Notifications enabled' : 'Turn on desktop notifications'}</span>
        </Button>
      </div>
    </Card>
  );
}
