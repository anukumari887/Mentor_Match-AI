import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Video,
  Volume2
} from 'lucide-react';
import { getBooking } from '../services/mentors';
import { connectVideoSocket, getRoomDetails } from '../services/video';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';

function getMediaErrorMessage(error) {
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
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'The camera needs a secure (https) connection.';
  }
  return 'Your camera or microphone could not be started. Check the device and try again.';
}

export default function VideoRoomPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State machine: checking | preview | joining | waiting | connected | reconnecting | failed | left
  const [sessionState, setSessionState] = useState('checking');

  const [booking, setBooking] = useState(null);
  const [room, setRoom] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Media state
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Device lists
  const [devices, setDevices] = useState({ cameras: [], mics: [], speakers: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  // Remote participant media indicators
  const [remoteMediaState, setRemoteMediaState] = useState({ audio: true, video: true });

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioAnimRef = useRef(null);
  const iceQueueRef = useRef([]);
  const localStreamRef = useRef(null);
  const mutedRef = useRef(false);
  const cameraOffRef = useRef(false);

  mutedRef.current = muted;
  cameraOffRef.current = cameraOff;

  // 1. Initial Load: Fetch booking & room details (with serverTime)
  useEffect(() => {
    let active = true;

    async function loadDetails() {
      try {
        setSessionState('checking');
        const [details, session] = await Promise.all([
          getRoomDetails(bookingId),
          getBooking(bookingId)
        ]);

        if (!active) return;
        setBooking(session);
        setRoom(details);

        if (details.serverTime) {
          const offset = new Date(details.serverTime).getTime() - Date.now();
          setServerOffset(offset);
        }

        if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
          setErrorMessage('Video calls need a camera-enabled browser on localhost or HTTPS.');
        }

        setSessionState('preview');
      } catch (err) {
        if (!active) return;
        setErrorMessage(err.message || 'Session details could not be loaded.');
        setSessionState('failed');
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [bookingId]);

  // 2. Real-time clock for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + serverOffset);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffset]);

  // Audio analyser helper
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

  // Populate devices list
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

  // 3. User explicit click: Request media stream
  const requestMedia = async (options = { video: true, audio: true }) => {
    setMediaError('');

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setMediaError('The camera needs a secure (https) connection.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Video calls need a camera-enabled browser on localhost or HTTPS.');
      return;
    }

    try {
      let stream;
      if (options.video && options.audio) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 24 },
              facingMode: 'user',
              ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : {})
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              ...(selectedMic ? { deviceId: { exact: selectedMic } } : {})
            }
          });
        } catch (initialErr) {
          if (initialErr?.name === 'OverconstrainedError') {
            // Retry automatically with simpler constraints
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } else {
            throw initialErr;
          }
        }
      } else if (options.audio && !options.video) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(selectedMic ? { deviceId: { exact: selectedMic } } : {})
          },
          video: false
        });
      } else if (!options.audio && !options.video) {
        // Listen only
        stream = new MediaStream();
      }

      // Stop previous local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaPermissionGranted(true);
      setupAudioAnalyser(stream);
      await refreshDevices();

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      setMediaError(getMediaErrorMessage(err));
    }
  };

  // Switch camera device
  const handleCameraChange = async (deviceId) => {
    setSelectedCamera(deviceId);
    if (!localStreamRef.current) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStreamRef.current.addTrack(newVideoTrack);
      newVideoTrack.enabled = !cameraOffRef.current;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Replace track in peer connection if active
      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      setMediaError(getMediaErrorMessage(err));
    }
  };

  // Switch mic device
  const handleMicChange = async (deviceId) => {
    setSelectedMic(deviceId);
    if (!localStreamRef.current) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];

      if (oldAudioTrack) {
        localStreamRef.current.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      localStreamRef.current.addTrack(newAudioTrack);
      newAudioTrack.enabled = !mutedRef.current;
      setupAudioAnalyser(localStreamRef.current);

      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        }
      }
    } catch (err) {
      setMediaError(getMediaErrorMessage(err));
    }
  };

  // Switch speaker sink
  const handleSpeakerChange = async (deviceId) => {
    setSelectedSpeaker(deviceId);
    if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
      try {
        await remoteVideoRef.current.setSinkId(deviceId);
      } catch {}
    }
  };

  // Video refs binding
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      try {
        const p = localVideoRef.current.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {}
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      try {
        const p = remoteVideoRef.current.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {}
    }
  }, [remoteStream]);

  // Clean up all tracks and connections
  const cleanupCall = () => {
    if (audioAnimRef.current) cancelAnimationFrame(audioAnimRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }

    if (socketRef.current) {
      try {
        socketRef.current.emit('leave-room', { bookingId });
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }
  };

  // Page unload & unmount cleanup
  useEffect(() => {
    const handlePageHide = () => cleanupCall();
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      cleanupCall();
    };
  }, [bookingId]);

  // Create PeerConnection & attach listeners
  const createPeerConnection = (socket, iceServers) => {
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }

    iceQueueRef.current = [];
    const pc = new RTCPeerConnection({ iceServers: iceServers || [] });

    // Add local tracks BEFORE offer/answer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStream(stream);
        setSessionState('connected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.connected) {
        socket.emit('signal', {
          bookingId,
          type: 'candidate',
          data: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setSessionState('connected');
      } else if (state === 'disconnected') {
        setSessionState('reconnecting');
        // Attempt ICE restart once
        try {
          pc.restartIce();
        } catch {}
      } else if (state === 'failed') {
        setSessionState('failed');
        setErrorMessage('Connection to the other participant failed. Click Try again.');
      }
    };

    peerRef.current = pc;
    return pc;
  };

  // 4. Join Session: Connect Socket.IO and establish call
  const handleJoinSession = async () => {
    if (!mediaPermissionGranted) {
      await requestMedia();
      if (!localStreamRef.current) return;
    }

    setSessionState('joining');
    setStatusMessage('Connecting to session...');
    setErrorMessage('');

    const socket = connectVideoSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { bookingId }, (result) => {
        if (!result?.ok) {
          setErrorMessage(result?.error?.message || 'Could not join session room.');
          setSessionState('failed');
          return;
        }

        // Emit our current media states
        socket.emit('media-state', {
          bookingId,
          audio: !mutedRef.current,
          video: !cameraOffRef.current
        });

        setSessionState('waiting');
        setStatusMessage(`Waiting for ${otherUserName} to join.`);
      });
    });

    socket.on('connect_error', () => {
      setErrorMessage('Could not connect to the video server. Check your connection.');
      setSessionState('failed');
    });

    socket.on('room-error', (err) => {
      if (err.code === 'SESSION_REPLACED') {
        setErrorMessage('You joined this session in another window or tab. This session has been replaced.');
      } else {
        setErrorMessage(err.message || 'Room error occurred.');
      }
      setSessionState('failed');
    });

    // Sent ONLY to the occupant already in the room when a new peer arrives
    socket.on('peer-joined', async () => {
      try {
        const pc = createPeerConnection(socket, room?.iceServers);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { bookingId, type: 'offer', data: offer });
        // Emit media-state so peer sees our current mute/video state
        socket.emit('media-state', {
          bookingId,
          audio: !mutedRef.current,
          video: !cameraOffRef.current
        });
      } catch (err) {
        setErrorMessage('Failed to create call connection.');
        setSessionState('failed');
      }
    });

    socket.on('peer-left', () => {
      setRemoteStream(null);
      if (peerRef.current) {
        try {
          peerRef.current.close();
        } catch {}
        peerRef.current = null;
      }
      setSessionState('waiting');
      setStatusMessage(`Waiting for ${otherUserName} to join.`);
    });

    socket.on('media-state', (state) => {
      if (state) {
        setRemoteMediaState({
          audio: state.audio !== false,
          video: state.video !== false
        });
      }
    });

    socket.on('signal', async (signal) => {
      try {
        if (signal.type === 'offer') {
          const pc = createPeerConnection(socket, room?.iceServers);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data));

          // Drain queued candidates
          while (iceQueueRef.current.length > 0) {
            const cand = iceQueueRef.current.shift();
            await pc.addIceCandidate(cand);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { bookingId, type: 'answer', data: answer });
          socket.emit('media-state', {
            bookingId,
            audio: !mutedRef.current,
            video: !cameraOffRef.current
          });
        } else if (signal.type === 'answer') {
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal.data));
            while (iceQueueRef.current.length > 0) {
              const cand = iceQueueRef.current.shift();
              await peerRef.current.addIceCandidate(cand);
            }
          }
        } else if (signal.type === 'candidate') {
          const candidate = new RTCIceCandidate(signal.data);
          if (peerRef.current && peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(candidate);
          } else {
            iceQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        setErrorMessage('Failed to update call stream.');
      }
    });
  };

  // Toggle Microphone (track.enabled, does not stop track)
  const toggleMicrophone = () => {
    const nextState = !muted;
    setMuted(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('media-state', {
        bookingId,
        audio: !nextState,
        video: !cameraOffRef.current
      });
    }
  };

  // Toggle Camera (track.enabled, does not stop track)
  const toggleCamera = () => {
    const nextState = !cameraOff;
    setCameraOff(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('media-state', {
        bookingId,
        audio: !mutedRef.current,
        video: !nextState
      });
    }
  };

  // Leave room: clean up everything and navigate away
  const handleLeave = () => {
    setSessionState('left');
    cleanupCall();
    navigate('/sessions');
  };

  // Room timing calculation
  const opensAtMs = room?.opensAt ? new Date(room.opensAt).getTime() : 0;
  const closesAtMs = room?.closesAt ? new Date(room.closesAt).getTime() : 0;
  const secondsUntilOpen = opensAtMs ? Math.max(0, Math.floor((opensAtMs - now) / 1000)) : 0;
  const isRoomEnded = closesAtMs ? now > closesAtMs : false;
  const isRoomOpen = opensAtMs && closesAtMs ? now >= opensAtMs && now <= closesAtMs : room?.canJoin;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const otherUser = user?.role === 'learner' ? booking?.mentorId : booking?.learnerId;
  const otherUserName = otherUser?.name || 'your mentor';

  return (
    <section className="page-wrap flex-1 py-4 sm:py-6 bg-bg text-ink transition-colors flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <Link
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              to="/sessions"
            >
              <ArrowLeft size={14} /> My sessions
            </Link>
            <h1 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-ink">
              Session with {otherUserName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex h-2 w-2 rounded-full ${
                sessionState === 'connected'
                  ? 'bg-success'
                  : sessionState === 'waiting' || sessionState === 'joining'
                  ? 'bg-warning animate-pulse'
                  : 'bg-border-strong'
              }`}
            />
            <p
              className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink capitalize"
              role="status"
            >
              {sessionState === 'preview'
                ? isRoomOpen
                  ? 'Ready to join'
                  : 'Room not open yet'
                : sessionState === 'waiting'
                ? `Waiting for ${otherUserName}`
                : sessionState}
            </p>
          </div>
        </header>

        {/* Room closed / Ended Banner */}
        {!isRoomOpen && !isRoomEnded && room && (
          <Card variant="raised" padding="md" className="mb-4 border-l-4 border-l-warning bg-warning/5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-sm sm:text-base font-semibold text-ink flex items-center gap-2">
                <Clock size={16} className="text-warning shrink-0" /> This room is not open yet
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-ink">
                Opens in {formatCountdown(secondsUntilOpen)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Rooms open 10 minutes prior to start time. You can join between{' '}
              <strong className="text-ink">{new Date(room.opensAt).toLocaleString()}</strong> and{' '}
              <strong className="text-ink">{new Date(room.closesAt).toLocaleString()}</strong>.
            </p>
          </Card>
        )}

        {isRoomEnded && (
          <Card variant="raised" padding="md" className="mb-4 border-l-4 border-l-danger bg-danger/5">
            <h2 className="font-serif text-sm sm:text-base font-semibold text-ink flex items-center gap-2">
              <AlertCircle size={16} className="text-danger shrink-0" /> This session has ended
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              The window for this session has closed. You can review your past sessions or book a new one.
            </p>
          </Card>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-3 text-xs sm:text-sm text-danger font-medium"
            role="alert"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> {errorMessage}
            </span>
            <button
              className="font-bold underline hover:opacity-80"
              onClick={handleJoinSession}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {/* Permission and Device Setup Card (Accessible anytime, even before room opens) */}
        {!mediaPermissionGranted && (
          <Card variant="raised" padding="md" className="mb-4 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-base font-semibold text-ink">
                  Check your camera and microphone
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Test your audio and video before the session starts so everything is ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                  onClick={() => requestMedia({ video: true, audio: true })}
                  type="button"
                >
                  Allow camera and microphone
                </button>
              </div>
            </div>

            {mediaError && (
              <div className="mt-3 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                <p className="font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" /> {mediaError}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => requestMedia({ video: true, audio: true })}
                    type="button"
                  >
                    Try again
                  </button>
                  <button
                    className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => requestMedia({ video: false, audio: true })}
                    type="button"
                  >
                    Join with microphone only
                  </button>
                  <button
                    className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => requestMedia({ video: true, audio: false })}
                    type="button"
                  >
                    Join without microphone
                  </button>
                  <button
                    className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => requestMedia({ video: false, audio: false })}
                    type="button"
                  >
                    Listen only
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Device Pickers Bar (Visible after permission granted) */}
        {mediaPermissionGranted && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-border bg-surface p-2.5 text-xs text-ink">
            {/* Camera Picker */}
            {devices.cameras.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Camera size={13} className="text-ink-muted shrink-0" />
                <select
                  aria-label="Select camera"
                  className="rounded border border-border bg-surface-inset px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
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

            {/* Mic Picker */}
            {devices.mics.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Mic size={13} className="text-ink-muted shrink-0" />
                <select
                  aria-label="Select microphone"
                  className="rounded border border-border bg-surface-inset px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
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

            {/* Speaker Picker (where setSinkId supported) */}
            {devices.speakers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Volume2 size={13} className="text-ink-muted shrink-0" />
                <select
                  aria-label="Select speaker"
                  className="rounded border border-border bg-surface-inset px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
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

            {/* Live Mic Level Indicator */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">Mic level:</span>
              <div
                aria-label="Microphone volume level"
                aria-valuenow={audioLevel}
                aria-valuemin="0"
                aria-valuemax="100"
                className="w-16 h-2 bg-surface-raised rounded-full overflow-hidden border border-border"
                role="progressbar"
              >
                <div
                  className="h-full bg-success transition-all duration-75"
                  style={{ width: `${muted ? 0 : audioLevel}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Video Viewport Stage: Phone stacks (remote first), Desktop 2 columns */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Remote Video Tile (First on mobile, second column on desktop) */}
          <figure
            aria-label={`Video of ${otherUserName}`}
            className="relative aspect-video max-h-[360px] overflow-hidden rounded bg-[#121214] border border-border order-1 md:order-2"
          >
            {remoteStream && remoteMediaState.video && (
              <video
                autoPlay
                className="h-full w-full object-cover"
                playsInline
                ref={remoteVideoRef}
              />
            )}

            {/* Remote camera off placeholder (Initials Avatar) */}
            {(!remoteStream || !remoteMediaState.video) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Avatar name={otherUserName} size="lg" />
                <p className="mt-3 text-xs font-semibold text-white/90">
                  {sessionState === 'waiting'
                    ? `Waiting for ${otherUserName} to join.`
                    : `${otherUserName} has camera off`}
                </p>
                {sessionState === 'waiting' && (
                  <p className="mt-1 text-[11px] text-white/60">
                    The call will begin automatically when they enter.
                  </p>
                )}
              </div>
            )}

            {/* Remote Muted Icon Indicator */}
            {remoteStream && !remoteMediaState.audio && (
              <div
                aria-label={`${otherUserName} is muted`}
                className="absolute top-3 right-3 rounded-full bg-[#121214]/90 p-1.5 text-danger border border-white/20 shadow"
                role="status"
              >
                <MicOff size={13} />
              </div>
            )}

            {/* Solid dark chip label (Contrast >= 4.5:1 in all 6 themes) */}
            <figcaption className="absolute bottom-3 left-3 rounded bg-[#121214]/90 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/20 shadow">
              {otherUserName}
            </figcaption>
          </figure>

          {/* Local "You" Tile */}
          <figure
            aria-label="Your camera preview"
            className="relative aspect-video max-h-[360px] overflow-hidden rounded bg-[#121214] border border-border order-2 md:order-1"
          >
            <video
              autoPlay
              className="h-full w-full object-cover scale-x-[-1]"
              muted
              playsInline
              ref={localVideoRef}
            />

            {/* Camera off placeholder */}
            {cameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121214] text-white/80">
                <CameraOff size={28} className="mb-2 text-white/40" />
                <p className="text-xs font-semibold">Camera off</p>
              </div>
            )}

            {!localStream && !cameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121214] text-white/70 p-4 text-center">
                <Video size={28} className="mb-2 text-white/40" />
                <p className="text-xs">Camera preview will appear here</p>
              </div>
            )}

            {/* Solid dark chip label */}
            <figcaption className="absolute bottom-3 left-3 rounded bg-[#121214]/90 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/20 shadow">
              You
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Control Dock */}
      <div className="mt-4 pt-3 border-t border-border flex flex-col items-center gap-2">
        {sessionState === 'preview' && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              aria-label={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
              className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
                muted ? 'border-danger/50 text-danger bg-danger/10' : ''
              }`}
              onClick={toggleMicrophone}
              type="button"
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              aria-label={cameraOff ? 'Camera on' : 'Camera off'}
              aria-pressed={cameraOff}
              className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
                cameraOff ? 'border-danger/50 text-danger bg-danger/10' : ''
              }`}
              onClick={toggleCamera}
              type="button"
            >
              {cameraOff ? <CameraOff size={14} /> : <Camera size={14} />}
              <span>{cameraOff ? 'Camera on' : 'Camera off'}</span>
            </button>

            <button
              className="rounded bg-accent px-5 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              disabled={!isRoomOpen || isRoomEnded}
              onClick={handleJoinSession}
              type="button"
            >
              <Video size={14} /> Join session
            </button>
          </div>
        )}

        {(sessionState === 'waiting' || sessionState === 'connected' || sessionState === 'reconnecting') && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              aria-label={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
              className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
                muted ? 'border-danger/50 text-danger bg-danger/10' : ''
              }`}
              onClick={toggleMicrophone}
              type="button"
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              aria-label={cameraOff ? 'Camera on' : 'Camera off'}
              aria-pressed={cameraOff}
              className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
                cameraOff ? 'border-danger/50 text-danger bg-danger/10' : ''
              }`}
              onClick={toggleCamera}
              type="button"
            >
              {cameraOff ? <CameraOff size={14} /> : <Camera size={14} />}
              <span>{cameraOff ? 'Camera on' : 'Camera off'}</span>
            </button>

            <button
              className="rounded bg-danger px-4 py-2 text-xs font-semibold text-surface hover:opacity-90 transition-opacity flex items-center gap-1.5"
              onClick={handleLeave}
              type="button"
            >
              <PhoneOff size={14} /> Leave session
            </button>
          </div>
        )}

        {/* Short line under controls */}
        <p className="text-[11px] text-ink-muted">This call is not recorded.</p>

        {/* Part 7: External Meeting Link Backup */}
        {booking?.externalMeetingUrl && (
          <p className="mt-1 text-xs text-ink-muted">
            <a
              className="text-accent underline hover:opacity-80 inline-flex items-center gap-1 font-medium"
              href={booking.externalMeetingUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Use Google Meet / Zoom instead <ExternalLink size={11} />
            </a>
            <span className="text-[11px] ml-1">(This opens an outside website.)</span>
          </p>
        )}
      </div>
    </section>
  );
}