import React from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

export default function InterviewSummary({ summaries }) {
  if (!summaries || summaries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase flex items-center gap-2">
        <FileText className="w-4 h-4" />
        ヒアリング要約
      </h3>
      <div className="space-y-2">
        {summaries.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <h4 className="text-xs font-semibold text-foreground">{item.item}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">{item.summary}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}