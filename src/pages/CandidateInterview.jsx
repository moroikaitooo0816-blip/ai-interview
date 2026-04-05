import React, { useState, useRef } from "react";
import { Interview, invokeInterviewChat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "@/components/interview/ChatBubble";
import TypingIndicator from "@/components/interview/TypingIndicator";
import ScoreDisplay from "@/components/interview/ScoreDisplay";
import InterviewSummary from "@/components/interview/InterviewSummary";
import TranscriptView from "@/components/interview/TranscriptView";

export default function CandidateInterview() {
  const [interviewId, setInterviewId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    }, 100);
  };

  const startInterview = async () => {
    setIsLoading(true);
    const interview = await Interview.create({ candidate_name: "新規候補者", status: "in_progress", messages: [] });
    setInterviewId(interview.id);
    setStarted(true);
    const response = await invokeInterviewChat({ interview_id: interview.id, is_start: true });
    const aiMsg = { role: "assistant", content: response.message, timestamp: new Date().toISOString() };
    setMessages([aiMsg]);
    setIsLoading(false);
    scrollToBottom();
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();
    const response = await invokeInterviewChat({ interview_id: interviewId, message: userMsg.content });
    const aiMsg = { role: "assistant", content: response.message, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
    scrollToBottom();
    if (response.type === "complete") {
      setIsCompleted(true);
      setResult({ summaries: response.summaries, score: response.score, scoreBreakdown: response.score_breakdown, overallComment: response.overall_comment, messages: [...messages, userMsg, aiMsg] });
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">AI初回面談</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">転職支援のための初回ヒアリングを行います。<br />AIが面接官として、あなたのご経歴・ご希望について<br />お伺いいたします。所要時間は約10〜15分です。</p>
          <Button onClick={startInterview} size="lg" className="px-8 py-6 text-base font-medium">面談を開始する</Button>
          <p className="text-[11px] text-muted-foreground mt-4">※ 面談内容は採用プロセスにおいて参考情報として使用されます</p>
        </motion.div>
      </div>
    );
  }

  if (isCompleted && result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">面談完了</h1>
            <p className="text-sm text-muted-foreground mt-1">ご参加ありがとうございました</p>
          </div>
          <Tabs defaultValue="score" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="score">評価</TabsTrigger>
              <TabsTrigger value="summary">要約</TabsTrigger>
              <TabsTrigger value="transcript">全文</TabsTrigger>
            </TabsList>
            <TabsContent value="score"><ScoreDisplay score={result.score} scoreBreakdown={result.scoreBreakdown} overallComment={result.overallComment} /></TabsContent>
            <TabsContent value="summary"><InterviewSummary summaries={result.summaries} /></TabsContent>
            <TabsContent value="transcript"><TranscriptView messages={result.messages} /></TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">AI面接官</h1>
            <p className="text-[11px] text-muted-foreground">初回面談 進行中</p>
          </div>
        </div>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 px-4">
        <div className="max-w-2xl mx-auto py-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => <ChatBubble key={i} message={msg} isLast={i === messages.length - 1} />)}
          </AnimatePresence>
          {isLoading && <TypingIndicator />}
        </div>
      </ScrollArea>
      <div className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="メッセージを入力..." disabled={isLoading} className="flex-1 bg-background" />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
