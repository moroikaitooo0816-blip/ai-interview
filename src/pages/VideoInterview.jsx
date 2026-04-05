import React, { useState, useRef } from "react";
import { SimliClient, generateSimliSessionToken } from "simli-client";
import { Button } from "@/components/ui/button";
import { Briefcase, Mic, MicOff, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

export default function VideoInterview() {
  const [phase, setPhase] = useState("idle"); // idle, connecting, active, ended
  const [status, setStatus] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const localVideoRef = useRef(null);
  const simliClientRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  const startInterview = async () => {
    setPhase("connecting");
    setStatus("カメラ・マイクに接続中...");
    try {
      // 1. カメラ・マイク取得
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      setStatus("AIサーバーに接続中...");

      // 2. サーバーからAI返答とSimli設定を取得
      const response = await fetch('/api/video-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_start: true, conversation_history: [] }),
      });
      const data = await response.json();

      setStatus("アバターを起動中...");

      // 3. Simliセッショントークンを取得（generateSimliSessionTokenの正しい使い方）
      const tokenData = await generateSimliSessionToken({
        apiKey: data.simli_api_key,
        config: {
          faceId: data.face_id,
          handleSilence: true,
          maxSessionLength: 600,
          maxIdleTime: 300,
        }
      });
      const sessionToken = tokenData.session_token;

      // 4. SimliClientをLivekitモードで作成
      // videoRef.current と audioRef.current はDOMがレンダリングされているのでnullではない
      const simliClient = new SimliClient(
        sessionToken,
        videoRef.current,
        audioRef.current,
        null,
        undefined,
        "livekit"
      );
      simliClientRef.current = simliClient;

      // 5. 接続開始
      await simliClient.start();

      // 6. 最初の音声を送信
      const audioData = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
      simliClient.sendAudioData(audioData);

      setConversationHistory([{ role: 'assistant', content: data.ai_text }]);
      setPhase("active");
      setStatus("面談中");
      startSpeechRecognition();

    } catch (error) {
      console.error('Start error:', error);
      setStatus("エラー: " + (error.message || error));
      setPhase("idle");
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
    if (simliClientRef.current) simliClientRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setPhase("ended");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* 常にDOMに存在させる（refをnullにしないため） */}
      <video ref={videoRef} autoPlay playsInline className={phase === "active" ? "absolute inset-0 w-full h-full object-cover" : "hidden"} />
      <audio ref={audioRef} autoPlay />

      {phase === "idle" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-lg">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">AIビデオ面談</h1>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              AIアバターとのビデオ面談を開始します。<br />
              カメラとマイクのアクセスを許可してください。<br />
              所要時間は約10〜15分です。
            </p>
            <Button onClick={startInterview} size="lg" className="px-8 py-6 text-base font-medium">
              ビデオ面談を開始する
            </Button>
            <p className="text-[11px] text-muted-foreground mt-4">※ カメラ・マイクの使用許可が必要です</p>
          </motion.div>
        </div>
      )}

      {phase === "connecting" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm">{status}</p>
          </div>
        </div>
      )}

      {phase === "active" && (
        <>
          <div className="flex-shrink-0 bg-black/80 px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-medium">{status}</span>
            </div>
            <span className="text-white/50 text-xs">AIビデオ面談</span>
          </div>
          <div className="flex-1 relative">
            <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 z-10">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-shrink-0 bg-black/80 px-4 py-6 flex items-center justify-center gap-4 z-10">
            <Button variant="outline" size="icon" onClick={() => {
              if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
                setIsMuted(!isMuted);
              }
            }} className="w-12 h-12 rounded-full bg-white/10 border-white/20 hover:bg-white/20">
              {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </Button>
            <Button onClick={endInterview} size="icon" className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600">
              <PhoneOff className="w-6 h-6 text-white" />
            </Button>
          </div>
        </>
      )}

      {phase === "ended" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">面談が終了しました</h2>
            <p className="text-white/70 mb-8">ご参加ありがとうございました</p>
            <Button onClick={() => window.location.href = '/'}>
              トップページへ戻る
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
