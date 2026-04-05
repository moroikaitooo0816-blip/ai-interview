import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";

export default function ChatBubble({ message, isLast }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-1",
        isUser ? "bg-primary/10" : "bg-primary"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-border rounded-tl-sm shadow-sm"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.timestamp && (
          <p className={cn(
            "text-[10px] mt-1.5",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {new Date(message.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </motion.div>
  );
}