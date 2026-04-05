import React, { useState, useRef } from "react";
import { SimliClient } from "simli-client";
import { Button } from "@/components/ui/button";
import { Briefcase, Mic, MicOff, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

export default function VideoInterview() {
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("待機中");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const simliClientRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  const startInterview = async () => {
    setIsConnecting(true);
    setStatus("接続中...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const response = await fetch('/api/video-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_start: true, conversation_history: [] }),
      });
      const data = await response.json();

      // サーバーサイドでセッショントークンを取得
      const tokenRes = await fetch('/api/simli-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_id: data.face_id }),
      });
      const tokenData = await tokenRes.json(); const sessionToken = tokenData.session_token;

      const simliClient = new SimliClient(
        sessionToken,
        videoRef,
        { current: new Audio() },
        null,
        undefined,
        "livekit"
      );
      simliClientRef.current = simliClient;

      await simliClient.start();

      const audioData = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
      simliClient.sendAudioData(audioData);

      setConversationHistory([{ role: 'assistant', content: data.ai_text }]);
      setIsStarted(true);
      setIsConnecting(false);
      setStatus("面談中");
      startSpeechRecognition();
    } catch (error) {
      console.error('Start error:', error);
      setStatus("エラー: " + error.message);
      setIsConnecting(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (transcript.trim() && !isAISpeaking) await sendMessage(transcript);
    };
    recognition.onerror = (e) => console.error('Speech error:', e);
    recognition.start();
  };

  const sendMessage = async (userText) => {
    setIsAISpeaking(true);
    setStatus("AI応答中...");
    const newHistory = [...conversationHistory, { role: 'user', content: userText }];
    try {
      const response = await fetch('/api/video-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: userText, conversation_history: newHistory, is_start: false }),
      });
      const data = await response.json();
      if (simliClientRef.current) {
        const audioData = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
        simliClientRef.current.sendAudioData(audioData);
      }
      setConversationHistory([...newHistory, { role: 'assistant', content: data.ai_text }]);
      setStatus("面談中");
      setTimeout(() => setIsAISpeaking(false), 3000);
    } catch (error) {
      setIsAISpeaking(false);
      setStatus("面談中");
    }
  };

  const endInterview = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (simliClientRef.current) simliClientRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsStarted(false);
    setStatus("面談終了");
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">AIビデオ面談</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">AIアバターとのビデオ面談を開始します。<br />カメラとマイクのアクセスを許可してください。<br />所要時間は約10〜15分です。</p>
          {status !== "待機中" && <p className="text-sm text-red-500 mb-4">{status}</p>}
          <Button onClick={startInterview} disabled={isConnecting} size="lg" className="px-8 py-6 text-base font-medium">
            {isConnecting ? "接続中..." : "ビデオ面談を開始する"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-4">※ カメラ・マイクの使用許可が必要です</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-shrink-0 bg-black/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm font-medium">{status}</span>
        </div>
        <span className="text-white/50 text-xs">AIビデオ面談</span>
      </div>
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex-shrink-0 bg-black/80 px-4 py-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => {
          if (streamRef.current) { streamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted); setIsMuted(!isMuted); }
        }} className="w-12 h-12 rounded-full bg-white/10 border-white/20 hover:bg-white/20">
          {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </Button>
        <Button onClick={endInterview} size="icon" className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600">
          <PhoneOff className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
