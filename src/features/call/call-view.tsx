import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { Button } from '@/components/ui/button';
import * as api from '@/features/puja/api';
import { PersonAvatar } from '@/features/puja/components/person';
import { useMe } from '@/features/puja/hooks';
import { pujaQueries } from '@/features/puja/queries';
import { socketTarget } from '@/lib/env';
import { errorMessage } from '@/lib/utils';

/**
 * The user calls the astrologer from a puja booking (calling-service `POST /call/initialize/puja`).
 * The astrologer is rung in the Sobhagya app as for any call; here the user joins the LiveKit room
 * and follows the call on calling-service's call socket (`register`, `call_end`, `end_call`).
 */

type Phase = 'starting' | 'ringing' | 'connected' | 'ended';

const END_REASONS: Record<string, string> = {
  CALL_TIMEOUT: 'No answer',
  CONSULTATION_EXPIRED: 'The booked time is over',
  CALL_COMPLETED: 'Call ended',
};

function newChannel(bookingId: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Math.random()).slice(2, 10);
  return `puja_${bookingId}_${Date.now()}_${random}`;
}

export function CallView({ bookingId, video }: { bookingId: string; video: boolean }) {
  const router = useRouter();
  const me = useMe().data;
  const thread = useQuery(pujaQueries.thread(bookingId));
  const [phase, setPhase] = useState<Phase>('starting');
  const [endNote, setEndNote] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(!video);
  const [seconds, setSeconds] = useState(0);

  const room = useRef<Room | null>(null);
  const callSocket = useRef<Socket | null>(null);
  const channel = useRef<string | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const audioHost = useRef<HTMLDivElement>(null);
  const ended = useRef(false);

  const finish = (note: string | null, notifyServer: boolean) => {
    if (ended.current) return;
    ended.current = true;
    if (notifyServer && callSocket.current && channel.current && me) {
      callSocket.current.emit(
        'end_call',
        { channelId: channel.current, userId: me.userId, reason: 'USER_ENDED_CALL' },
        () => undefined,
      );
    }
    void room.current?.disconnect();
    setTimeout(() => callSocket.current?.disconnect(), 500);
    setEndNote(note);
    setPhase('ended');
  };

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    let started = false;
    const channelId = newChannel(bookingId);
    channel.current = channelId;

    // Deferred a tick: a mount that is torn down at once (StrictMode, fast back) must not ring anyone.
    const timer = setTimeout(async () => {
      started = true;
      ended.current = false;
      try {
        const call = await api.startPujaCall(bookingId, channelId, video ? 'video' : 'call');
        if (cancelled) return;

        const { url, path } = socketTarget('calling');
        const socket = io(url, { path, transports: ['websocket'] });
        callSocket.current = socket;
        socket.on('connect', () => socket.emit('register', { userId: me.userId, channelId }));
        socket.on('call_end', (payload: { reason?: string }) => {
          finish(END_REASONS[payload?.reason ?? ''] ?? 'Call ended', false);
        });

        const lk = new Room({ adaptiveStream: true, dynacast: true });
        room.current = lk;
        lk.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video && remoteVideo.current) track.attach(remoteVideo.current);
          if (track.kind === Track.Kind.Audio) audioHost.current?.appendChild(track.attach());
        });
        lk.on(RoomEvent.ParticipantConnected, () => setPhase('connected'));
        lk.on(RoomEvent.ParticipantDisconnected, () => finish('Call ended', true));
        lk.on(RoomEvent.Disconnected, () => finish('Call ended', true));

        await lk.connect(call.livekitSocketURL, call.token);
        if (cancelled) {
          void lk.disconnect();
          return;
        }
        await lk.localParticipant.setMicrophoneEnabled(true);
        if (video) {
          const pub = await lk.localParticipant.setCameraEnabled(true);
          if (pub?.track && localVideo.current) pub.track.attach(localVideo.current);
        }
        setPhase(lk.remoteParticipants.size > 0 ? 'connected' : 'ringing');
      } catch (err) {
        if (!cancelled) finish(errorMessage(err, 'The call could not be started'), true);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (started) finish(null, true);
    };
    // A call is started once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.userId, bookingId, video]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    void room.current?.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };
  const toggleCamera = async () => {
    const next = !cameraOff;
    const pub = await room.current?.localParticipant.setCameraEnabled(!next);
    if (!next && pub?.track && localVideo.current) pub.track.attach(localVideo.current);
    setCameraOff(next);
  };

  const name = thread.data?.providerName || 'Astrologer';
  const status =
    phase === 'starting'
      ? 'Connecting…'
      : phase === 'ringing'
        ? 'Ringing…'
        : phase === 'connected'
          ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
          : endNote || 'Call ended';

  return (
    <main className="relative flex h-svh flex-col items-center justify-between bg-neutral-950 px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)] text-white">
      {video && (
        <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
      )}
      {video && (
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-4 z-10 h-36 w-24 rounded-xl bg-neutral-800 object-cover"
        />
      )}
      <div ref={audioHost} className="hidden" />

      <div className="z-10 flex flex-col items-center gap-3 text-center">
        <PersonAvatar name={name} src={thread.data?.providerAvatar} className="size-24 text-2xl" />
        <p className="text-xl font-semibold">{name}</p>
        <p className="flex items-center gap-1.5 text-sm text-white/70">
          {(phase === 'starting' || phase === 'ringing') && <Loader2 className="size-4 animate-spin" />}
          {status}
        </p>
        {thread.data?.pujaName && <p className="text-xs text-white/50">{thread.data.pujaName}</p>}
      </div>

      {phase === 'ended' ? (
        <Button variant="secondary" className="z-10 h-11 px-8" onClick={() => router.history.back()}>
          Back
        </Button>
      ) : (
        <div className="z-10 flex items-center gap-6">
          <RoundButton label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute} active={muted}>
            {muted ? <MicOff /> : <Mic />}
          </RoundButton>
          <button
            type="button"
            aria-label="End call"
            onClick={() => finish('Call ended', true)}
            className="flex size-16 items-center justify-center rounded-full bg-destructive text-white [&_svg]:size-7"
          >
            <PhoneOff />
          </button>
          {video ? (
            <RoundButton
              label={cameraOff ? 'Camera on' : 'Camera off'}
              onClick={() => void toggleCamera()}
              active={cameraOff}
            >
              {cameraOff ? <VideoOff /> : <Video />}
            </RoundButton>
          ) : (
            <span className="size-14" />
          )}
        </div>
      )}
    </main>
  );
}

function RoundButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-14 items-center justify-center rounded-full [&_svg]:size-6 ${active ? 'bg-white text-neutral-900' : 'bg-white/15 text-white'}`}
    >
      {children}
    </button>
  );
}
