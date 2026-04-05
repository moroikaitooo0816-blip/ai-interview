import React from "react";
import { motion } from "framer-motion";
import { FileText, Star, AlertCircle, MessageSquare, Users, HelpCircle } from "lucide-react";

const typeConfig = {
  strength: { label: "強み", icon: Star, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  concern: { label: "懸念点", icon: AlertCircle, className: "text-amber-700 bg-amber-50 border-amber-200" },
  recommendation_reason: { label: "判定理由", icon: FileText, className: "text-blue-700 bg-blue-50 border-blue-200" },
  candidate_feedback: { label: "候補者へのフィードバック", icon: MessageSquare, className: "text-purple-700 bg-purple-50 border-purple-200" },
  followup: { label: "追加で確認すべき質問", icon: HelpCircle, className: "text-slate-700 bg-slate-50 border-slate-200" },
};

export default function InterviewSummary({ summaries }) {
  if (!summaries || summaries.length === 0) return null;

  // typeでグループ化
  const grouped = {};
  summaries.forEach(item => {
    if (item.type === 'social_skills') return; // 別途表示
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item.content);
  });

  // 社会人基礎力
  const socialSkillsItem = summaries.find(s => s.type === 'social_skills');
  let socialSkills = null;
  if (socialSkillsItem) {
    try { socialSkills = JSON.parse(socialSkillsItem.content); } catch(e) {}
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items], groupIndex) => {
        const config = typeConfig[type] || { label: type, icon: FileText, className: "text-slate-700 bg-slate-50 border-slate-200" };
        const Icon = config.icon;
        return (
          <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIndex * 0.05 }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-foreground">{config.label}</h4>
            </div>
            <div className="space-y-2">
              {items.map((content, i) => (
                <div key={i} className={`border rounded-lg px-4 py-3 text-xs leading-relaxed ${config.className}`}>
                  {content}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {socialSkills && Object.keys(socialSkills).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">社会人基礎力</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(socialSkills).map(([key, score], i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{key}</span>
                  <span className="text-xs font-bold text-primary">{score}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
