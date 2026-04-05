import React, { useState, useRef, useEffect } from "react";
import { SimliClient } from "simli-client";
import { Button } from "@/components/ui/button";
import { Briefcase, Mic, MicOff, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

export default function VideoInterview() {
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const [candidateId, setCandidateId] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setCandidateId(id);
      fetch(`/api/interviews/${id}`)
        .then(r => r.json())
        .then(data => setCandidateInfo(data))
        .catch(console.error);
    }
  }, []);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const localVideoRef = useRef(null);
  const simliClientRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const isAISpeakingRef = useRef(false);
  const conversationHistoryRef = useRef([]);

  const startInterview = async () => {
    setPhase("connecting");
    setStatus("接続中...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // サーバーからトークン・AI応答・音声を一括取得
      const response = await fetch('/api/video-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_start: true, conversation_history: [], candidate_id: candidateId }),
      });
      const data = await response.json();

      // トークン取得直後すぐにSimliClient接続
      const simliClient = new SimliClient(
        data.session_token,
        videoRef.current,
        audioRef.current,
        null,
        undefined,
        "livekit"
      );
      simliClientRef.current = simliClient;
      await simliClient.start();

      setPhase("active");
      setStatus("面談中");

      // 音声送信
      isAISpeakingRef.current = true;
      setIsAISpeaking(true);
      // AIが喋る間は音声認識を停止
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} }

      const audioData = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
      simliClient.sendAudioData(audioData);

      const speakDuration = (audioData.length / 2 / 16000) * 1000 + 300;
      setTimeout(() => {
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
        // AI発話終了後に音声認識を再開
        if (recognitionRef.current) { try { recognitionRef.current.start(); } catch(e) {} }
      }, speakDuration);

      const initHistory = [{ role: 'assistant', content: data.ai_text, timestamp: new Date().toISOString() }];
      conversationHistoryRef.current = initHistory;
      setConversationHistory(initHistory);
      startSpeechRecognition();

    } catch (error) {
      console.error('Start error:', error);
      setStatus("エラー: " + (error.message || String(error)));
      setPhase("idle");
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    let silenceTimer = null;
    let accumulatedText = '';

    recognition.onresult = (event) => {
      if (isAISpeakingRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          accumulatedText += event.results[i][0].transcript;
        }
      }

      // 声が検知されるたびにタイマーをリセット（話している間はAIに切り替わらない）
      if (silenceTimer) clearTimeout(silenceTimer);

      // ユーザーが5秒黙ったらAIが応答
      silenceTimer = setTimeout(async () => {
        const text = accumulatedText.trim();
        accumulatedText = '';
        silenceTimer = null;
        if (text && !isAISpeakingRef.current) {
          await sendMessage(text);
        }
      }, 5000);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.error('Speech error:', e.error);
    };

    recognition.onend = () => {
      // AIが喋っていない時だけ再起動
      if (recognitionRef.current === recognition && !isAISpeakingRef.current) {
        try { recognition.start(); } catch(e) {}
      }
    };

    recognition.start();
  };

  const sendMessage = async (userText) => {
    isAISpeakingRef.current = true;
    setIsAISpeaking(true);
    setStatus("AI応答中...");

    const newHistory = [...conversationHistoryRef.current, { role: 'user', content: userText, timestamp: new Date().toISOString() }];

    try {
      const response = await fetch('/api/video-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: userText, conversation_history: newHistory, is_start: false }),
      });
      const data = await response.json();

      if (simliClientRef.current) {
        // AIが喋る間は音声認識を停止
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} }

        const audioData = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
        simliClientRef.current.sendAudioData(audioData);

        const speakDuration = (audioData.length / 2 / 16000) * 1000 + 300;
        setTimeout(() => {
          isAISpeakingRef.current = false;
          setIsAISpeaking(false);
          setStatus("面談中");
          // AI発話終了後に音声認識を再開
          if (recognitionRef.current) { try { recognitionRef.current.start(); } catch(e) {} }
        }, speakDuration);
      }

      const updatedHistory = [...newHistory, { role: 'assistant', content: data.ai_text, timestamp: new Date().toISOString() }];
      conversationHistoryRef.current = updatedHistory;
      setConversationHistory(updatedHistory);

    } catch (error) {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      setStatus("面談中");
    }
  };

  const endInterview = async () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (simliClientRef.current) simliClientRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

    // 面談結果を保存
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && conversationHistory.length > 0) {
      setPhase("saving");
      try {
        await fetch('/api/interview-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_id: id,
            conversation_history: conversationHistoryRef.current,
          }),
        });
      } catch(e) { console.error(e); }
    }
    setPhase("ended");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <video ref={videoRef} autoPlay playsInline className={phase === "active" ? "absolute inset-0 w-full h-full object-cover z-0" : "hidden"} />
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
              カメラとマイクのアクセスを許可してください。
            </p>
            <Button onClick={startInterview} size="lg" className="px-8 py-6 text-base font-medium">
              ビデオ面談を開始する
            </Button>
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
        <div className="relative z-10 flex flex-col h-screen">
          <div className="flex-shrink-0 bg-black/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAISpeaking ? 'bg-green-400 animate-pulse' : 'bg-blue-400 animate-pulse'}`} />
              <span className="text-white text-sm">{isAISpeaking ? "🔊 AI発話中..." : "🎤 話しかけてください"}</span>
            </div>
            <span className="text-white/50 text-xs">AIビデオ面談</span>
          </div>

          <div className="flex-1 relative">
            <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/30 z-10">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex-shrink-0 bg-black/60 px-4 py-6 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => {
              if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
                setIsMuted(!isMuted);
              }
            }} className="w-12 h-12 rounded-full bg-white/10 border-white/20">
              {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </Button>
            <Button onClick={endInterview} size="icon" className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600">
              <PhoneOff className="w-6 h-6 text-white" />
            </Button>
          </div>
        </div>
      )}

      {phase === "saving" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm">面談結果を保存中...</p>
          </div>
        </div>
      )}

      {phase === "ended" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">面談が終了しました</h2>
            <p className="text-white/70 mb-8">ご参加ありがとうございました</p>
            <Button onClick={() => window.location.href = '/'}>トップページへ戻る</Button>
          </div>
        </div>
      )}
    </div>
  );
}
