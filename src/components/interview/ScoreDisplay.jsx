import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function getScoreColor(score) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score) {
  if (score >= 80) return "from-emerald-500 to-emerald-600";
  if (score >= 60) return "from-amber-500 to-amber-600";
  return "from-red-500 to-red-600";
}

export default function ScoreDisplay({ score, scoreBreakdown, overallComment }) {
  const normalizedScore = Math.round(score);

  return (
    <div className="space-y-6">
      {/* Total Score */}
      <div className="text-center py-8">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wider uppercase">総合スコア</p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={cn(
            "inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br shadow-lg",
            getScoreBg(normalizedScore)
          )}
        >
          <div className="text-center">
            <span className="text-4xl font-bold text-white">{normalizedScore}</span>
            <span className="text-white/70 text-sm block">/100</span>
          </div>
        </motion.div>
        {overallComment && (
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {overallComment}
          </p>
        )}
      </div>

      {/* Score Breakdown */}
      {scoreBreakdown && scoreBreakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">項目別評価</h3>
          <div className="space-y-2">
            {scoreBreakdown.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">{item.item}</span>
                  <span className={cn("text-xs font-bold", getScoreColor(item.score * 10))}>
                    {item.score}/10
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score * 10}%` }}
                    transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                    className={cn("h-1.5 rounded-full bg-gradient-to-r", getScoreBg(item.score * 10))}
                  />
                </div>
                {item.comment && (
                  <p className="text-[11px] text-muted-foreground">{item.comment}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}