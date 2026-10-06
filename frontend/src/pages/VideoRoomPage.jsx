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
  Shield,
  Video
} from 'lucide-react';
import { getBooking } from '../services/mentors';
import { connectVideoSocket, getRoomDetails } from '../services/video';
import { useAuth } from '../contexts/AuthContext';

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
  const otherUser = user.role === 'learner' ? booking?.mentorId : booking?.learnerId;

  if (loading) {
    return (
      <div className="page-wrap flex-1 py-16 text-center text-sm text-slate-600" role="status">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="mt-3">Joining the session...</p>
      </div>
    );
  }

  return (
    <section className="page-wrap flex-1 py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline" to="/sessions">
            <ArrowLeft size={14} /> My sessions
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Session with {otherUser?.name || 'your mentor'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="rounded-full border border-slate-200 bg-surface-muted/60 px-3 py-1 text-xs font-bold text-slate-700" role="status">
            {connection}
          </p>
        </div>
      </header>

      {!room?.canJoin && !error && (
        <div className="card mb-6 p-6 border-l-4 border-l-amber-500 bg-amber-50/40">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-amber-600" /> This room is not open yet
          </h2>
          {room && (
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Rooms open 10 minutes prior to start time. You can join between{' '}
              <strong className="text-slate-800">{new Date(room.opensAt).toLocaleString()}</strong> and{' '}
              <strong className="text-slate-800">{new Date(room.closesAt).toLocaleString()}</strong>.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="notice-error mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm font-medium" role="alert">
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
        <figure className="relative aspect-video overflow-hidden rounded-xl bg-slate-950 shadow-md border border-slate-800">
          <video autoPlay className="h-full w-full object-cover" muted playsInline ref={localVideo} />
          <figcaption className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white border border-white/10">
            You
          </figcaption>
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-sm text-slate-300">
              <CameraOff size={28} className="mb-2 text-slate-500" />
              Camera off
            </div>
          )}
        </figure>

        <figure className="relative aspect-video overflow-hidden rounded-xl bg-slate-950 shadow-md border border-slate-800">
          {remoteStream && <video autoPlay className="h-full w-full object-cover" playsInline ref={remoteVideo} />}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-slate-400">
              <Video size={30} className="mb-2 text-slate-600" />
              Waiting for {otherUser?.name || 'the other participant'} to join.
            </div>
          )}
          <figcaption className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white border border-white/10">
            {otherUser?.name || 'Participant'}
          </figcaption>
        </figure>
      </div>

      {/* Control Dock */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          aria-label={muted ? 'Turn microphone on' : 'Mute microphone'}
          className={`quiet-button text-xs py-2.5 px-4 rounded-full ${muted ? 'bg-rose-50 text-rose-700 border-rose-300' : ''}`}
          disabled={!localStream}
          onClick={toggleMicrophone}
          type="button"
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          className={`quiet-button text-xs py-2.5 px-4 rounded-full ${cameraOff ? 'bg-rose-50 text-rose-700 border-rose-300' : ''}`}
          disabled={!localStream}
          onClick={toggleCamera}
          type="button"
        >
          {cameraOff ? <CameraOff size={16} /> : <Camera size={16} />}
          <span>{cameraOff ? 'Camera on' : 'Camera off'}</span>
        </button>

        <button
          className="primary-button bg-rose-700 hover:bg-rose-800 text-xs py-2.5 px-5 rounded-full"
          onClick={leaveRoom}
          type="button"
        >
          <PhoneOff size={16} /> Leave session
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-500">
        Camera and microphone access requires localhost or HTTPS. Direct WebRTC peer-to-peer encryption.
      </p>
    </section>
  );
}