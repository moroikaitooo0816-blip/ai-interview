import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatBubble from "./ChatBubble";

export default function TranscriptView({ messages }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">
        トランスクリプト
      </h3>
      <ScrollArea className="h-[400px] border border-border rounded-lg p-4 bg-background">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} isLast={i === messages.length - 1} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}