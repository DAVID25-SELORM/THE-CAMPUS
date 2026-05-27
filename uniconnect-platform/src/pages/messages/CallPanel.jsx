import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import {
  endCallSession,
  fetchCallSignals,
  sendCallSignal,
  subscribeToCallSignals,
  updateCallSession
} from "../../services/callService";
import { supabase } from "../../services/supabase";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function mediaConstraints(callType) {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 2
    },
    video: callType === "video"
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        }
      : false
  };
}

export default function CallPanel({ call, role, user, conversationName, onClose }) {
  const [accepted, setAccepted] = useState(role === "caller");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(call.call_type !== "video");
  const [status, setStatus] = useState(role === "caller" ? "Calling..." : "Incoming call");
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const processedSignals = useRef(new Set());
  const startedRef = useRef(false);

  async function ensureMedia() {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(call.call_type));
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }

  function ensurePeer() {
    if (peerRef.current) return peerRef.current;

    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    peer.onicecandidate = event => {
      if (!event.candidate) return;
      sendCallSignal({
        call_id: call.id,
        sender_id: user.id,
        signal_type: "ice",
        payload: event.candidate.toJSON()
      });
    };

    peer.ontrack = event => {
      event.streams[0]?.getTracks().forEach(track => {
        if (!remoteStreamRef.current.getTracks().some(existing => existing.id === track.id)) {
          remoteStreamRef.current.addTrack(track);
        }
      });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      setStatus("Connected");
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (["failed", "disconnected"].includes(peer.connectionState)) setStatus("Reconnecting...");
      if (peer.connectionState === "closed") setStatus("Call ended");
    };

    return peer;
  }

  async function addLocalTracks(peer) {
    const stream = await ensureMedia();
    const existingSenders = peer.getSenders().map(sender => sender.track?.id);
    stream.getTracks().forEach(track => {
      if (!existingSenders.includes(track.id)) peer.addTrack(track, stream);
    });
  }

  async function startCaller() {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus("Calling...");
    const peer = ensurePeer();
    await addLocalTracks(peer);
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: call.call_type === "video"
    });
    await peer.setLocalDescription(offer);
    await sendCallSignal({
      call_id: call.id,
      sender_id: user.id,
      signal_type: "offer",
      payload: offer.toJSON()
    });
  }

  async function processSignal(signal) {
    if (!signal?.id || processedSignals.current.has(signal.id) || signal.sender_id === user.id) return;
    processedSignals.current.add(signal.id);

    const peer = ensurePeer();

    if (signal.signal_type === "offer") {
      await addLocalTracks(peer);
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await updateCallSession(call.id, { status: "active" });
      await sendCallSignal({
        call_id: call.id,
        sender_id: user.id,
        signal_type: "answer",
        payload: answer.toJSON()
      });
      setStatus("Connected");
    }

    if (signal.signal_type === "answer" && peer.signalingState !== "stable") {
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await updateCallSession(call.id, { status: "active" });
      setStatus("Connected");
    }

    if (signal.signal_type === "ice" && peer.remoteDescription) {
      await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
    }
  }

  async function acceptCall() {
    setAccepted(true);
    setStatus("Connecting...");
    await ensureMedia();
    const { data } = await fetchCallSignals(call.id);
    for (const signal of data || []) await processSignal(signal);
  }

  async function endCall() {
    await endCallSession(call.id);
    cleanup();
    onClose();
  }

  function cleanup() {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
  }

  function toggleMute() {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }

  function toggleCamera() {
    const nextCameraOff = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
  }

  useEffect(() => {
    if (accepted && role === "caller") startCaller();
  }, [accepted, role, call.id]);

  useEffect(() => {
    if (!accepted) return;
    const channel = subscribeToCallSignals(call.id, payload => processSignal(payload.new));
    fetchCallSignals(call.id).then(async ({ data }) => {
      for (const signal of data || []) await processSignal(signal);
    });

    return () => supabase.removeChannel(channel);
  }, [accepted, call.id]);

  useEffect(() => cleanup, []);

  return (
    <div className="card mt-4 border-cyan-300/30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">{call.call_type === "video" ? "Video Call" : "Audio Call"}</h3>
          <p className="muted mt-1">{conversationName} / {status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "callee" && !accepted && (
            <button onClick={acceptCall} className="btn flex items-center gap-2"><Phone size={18} /> Accept</button>
          )}
          <button onClick={toggleMute} className="btn btn-secondary" disabled={!accepted} title="Toggle microphone" aria-label="Toggle microphone">
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          {call.call_type === "video" && (
            <button onClick={toggleCamera} className="btn btn-secondary" disabled={!accepted} title="Toggle camera" aria-label="Toggle camera">
              {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
          )}
          <button onClick={endCall} className="btn btn-secondary flex items-center gap-2">
            <PhoneOff size={18} /> End
          </button>
        </div>
      </div>

      {accepted && (
        <div className={`grid gap-4 mt-4 ${call.call_type === "video" ? "lg:grid-cols-2" : ""}`}>
          <video ref={remoteVideoRef} autoPlay playsInline className={`w-full rounded-2xl bg-black/40 border border-white/10 ${call.call_type === "video" ? "aspect-video" : "hidden"}`} />
          <video ref={localVideoRef} autoPlay playsInline muted className={`w-full rounded-2xl bg-black/40 border border-white/10 ${call.call_type === "video" ? "aspect-video" : "hidden"}`} />
          {call.call_type === "audio" && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
              <p className="text-3xl font-black">{status}</p>
              <p className="muted mt-2">High-quality audio session active with echo cancellation and noise suppression.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
