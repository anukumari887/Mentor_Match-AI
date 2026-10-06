import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  Video
} from 'lucide-react';
import { getBooking } from '../services/mentors';
import { connectVideoSocket, getRoomDetails } from '../services/video';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';

function friendlyMediaError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Camera and microphone access was blocked. Allow access in your browser settings, then rejoin.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera or microphone was found. Connect a device and try again.';
  }
  return 'Your camera or microphone could not be started. Check the device and try again.';
}

export default function VideoRoomPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const [booking, setBooking] = useState(null);
  const [room, setRoom] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('Connecting');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let socket;
    let peer;
    let media;
    const pendingCandidates = [];

    async function joinRoom() {
      try {
        const [details, session] = await Promise.all([getRoomDetails(bookingId), getBooking(bookingId)]);
        if (!active) return;
        setBooking(session);
        setRoom(details);
        if (!details.canJoin) {
          setConnection('Room closed');
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Video calls need a camera-enabled browser on localhost or HTTPS.');
          setConnection('Unavailable');
          return;
        }

        try {
          media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch (mediaError) {
          if (active) {
            setError(friendlyMediaError(mediaError));
            setConnection('Media unavailable');
          }
          return;
        }
        if (!active) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        setLocalStream(media);
        peer = new RTCPeerConnection({ iceServers: details.iceServers || [] });
        media.getTracks().forEach((track) => peer.addTrack(track, media));
        peer.ontrack = (event) => {
          const stream = event.streams[0];
          if (stream) setRemoteStream(stream);
        };
        peer.onicecandidate = (event) => {
          if (event.candidate && socket?.connected) {
            socket.emit('signal', { bookingId, type: 'candidate', data: event.candidate.toJSON() });
          }
        };
        peer.onconnectionstatechange = () => {
          if (active) setConnection(peer.connectionState === 'connected' ? 'Connected' : peer.connectionState);
        };

        socket = connectVideoSocket();
        socket.on('connect', () => {
          if (active) setConnection('Waiting for the other participant');
          socket.emit('join-room', { bookingId }, (result) => {
            if (!result?.ok && active) setError(result?.error?.message || 'This session could not be joined.');
          });
        });
        socket.on('connect_error', () => {
          if (active) {
            setConnection('Disconnected');
            setError('The secure session connection could not be established. Check your connection and retry.');
          }
        });
        socket.on('room-error', (roomError) => {
          if (active) {
            setConnection('Unable to join');
            setError(roomError.message || 'This session could not be joined.');
          }
        });
        socket.on('peer-joined', async () => {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit('signal', { bookingId, type: 'offer', data: offer });
          } catch {
            if (active) setError('The video connection could not be started. Leave and rejoin the session.');
          }
        });
        socket.on('peer-left', () => {
          if (active) {
            setRemoteStream(null);
            setConnection('Waiting for the other participant');
          }
        });
        socket.on('signal', async (signal) => {
          try {
            if (signal.type === 'offer') {
              await peer.setRemoteDescription(signal.data);
              for (const candidate of pendingCandidates.splice(0)) await peer.addIceCandidate(candidate);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              socket.emit('signal', { bookingId, type: 'answer', data: answer });
            } else if (signal.type === 'answer') {
              await peer.setRemoteDescription(signal.data);
              for (const candidate of pendingCandidates.splice(0)) await peer.addIceCandidate(candidate);
            } else if (signal.type === 'candidate') {
              const candidate = new RTCIceCandidate(signal.data);
              if (peer.remoteDescription) await peer.addIceCandidate(candidate);
              else pendingCandidates.push(candidate);
            }
          } catch {
            if (active) setError('A video connection update failed. Please leave and rejoin.');
          }
        });
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Session details could not be loaded.');
          setConnection('Unavailable');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    joinRoom();
    return () => {
      active = false;
      if (socket?.connected) {
        socket.emit('leave-room', { bookingId });
        socket.disconnect();
      }
      peer?.close();
      media?.getTracks().forEach((track) => track.stop());
    };
  }, [bookingId, retry]);

  useEffect(() => {
    if (localVideo.current && localStream) localVideo.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideo.current && remoteStream) remoteVideo.current.srcObject = remoteStream;
  }, [remoteStream]);

  const toggleMicrophone = () => {
    localStream?.getAudioTracks().forEach((track) => { track.enabled = muted; });
    setMuted((value) => !value);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => { track.enabled = cameraOff; });
    setCameraOff((value) => !value);
  };

  const leaveRoom = () => navigate('/sessions');
  const otherUser = user?.role === 'learner' ? booking?.mentorId : booking?.learnerId;

  if (loading) {
    return (
      <div className="page-wrap flex-1 py-16 text-center text-xs text-ink-muted" role="status">
        <p className="mt-3">Joining the session...</p>
      </div>
    );
  }

  return (
    <section className="page-wrap flex-1 py-8 sm:py-10 bg-bg text-ink transition-colors">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline" to="/sessions">
            <ArrowLeft size={14} /> My sessions
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
            Session with {otherUser?.name || 'your mentor'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-success" />
          <p className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink" role="status">
            {connection}
          </p>
        </div>
      </header>

      {!room?.canJoin && !error && (
        <Card variant="raised" padding="md" className="mb-6 border-l-4 border-l-warning bg-warning/5">
          <h2 className="font-serif text-base font-semibold text-ink flex items-center gap-2">
            <Clock size={16} className="text-warning" /> This room is not open yet
          </h2>
          {room && (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Rooms open 10 minutes prior to start time. You can join between{' '}
              <strong className="text-ink">{new Date(room.opensAt).toLocaleString()}</strong> and{' '}
              <strong className="text-ink">{new Date(room.closesAt).toLocaleString()}</strong>.
            </p>
          )}
        </Card>
      )}

      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger font-medium" role="alert">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {/* Video Viewport Stage */}
      <div className="grid gap-5 md:grid-cols-2">
        <figure className="relative aspect-video overflow-hidden rounded bg-ink/90 border border-border">
          <video autoPlay className="h-full w-full object-cover" muted playsInline ref={localVideo} />
          <figcaption className="absolute bottom-3 left-3 rounded bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-surface border border-surface/20">
            You
          </figcaption>
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/95 text-xs text-surface/80">
              <CameraOff size={24} className="mb-1 text-surface/50" />
              Camera off
            </div>
          )}
        </figure>

        <figure className="relative aspect-video overflow-hidden rounded bg-ink/90 border border-border">
          {remoteStream && <video autoPlay className="h-full w-full object-cover" playsInline ref={remoteVideo} />}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-xs text-surface/70">
              <Video size={26} className="mb-2 text-surface/40" />
              Waiting for {otherUser?.name || 'the other participant'} to join.
            </div>
          )}
          <figcaption className="absolute bottom-3 left-3 rounded bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-surface border border-surface/20">
            {otherUser?.name || 'Participant'}
          </figcaption>
        </figure>
      </div>

      {/* Control Dock */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          aria-label={muted ? 'Turn microphone on' : 'Mute microphone'}
          className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
            muted ? 'border-danger/50 text-danger bg-danger/10' : ''
          }`}
          disabled={!localStream}
          onClick={toggleMicrophone}
          type="button"
        >
          {muted ? <MicOff size={14} /> : <Mic size={14} />}
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          className={`rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors flex items-center gap-1.5 ${
            cameraOff ? 'border-danger/50 text-danger bg-danger/10' : ''
          }`}
          disabled={!localStream}
          onClick={toggleCamera}
          type="button"
        >
          {cameraOff ? <CameraOff size={14} /> : <Camera size={14} />}
          <span>{cameraOff ? 'Camera on' : 'Camera off'}</span>
        </button>

        <button
          className="rounded bg-danger px-4 py-2 text-xs font-semibold text-surface hover:opacity-90 transition-opacity flex items-center gap-1.5"
          onClick={leaveRoom}
          type="button"
        >
          <PhoneOff size={14} /> Leave session
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-muted">
        Camera and microphone access requires localhost or HTTPS. Direct WebRTC peer-to-peer connection.
      </p>
    </section>
  );
}