import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown, Plus, Trash2, Save, RotateCcw, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DEFAULT_QUESTIONS = [
  { id: "q1", text: "自己紹介をお願いします。", deepening: true },
  { id: "q2", text: "これまでのご経歴についてお聞かせください。", deepening: true },
  { id: "q3", text: "転職をお考えの理由をお聞かせください。", deepening: true },
  { id: "q4", text: "現在の転職活動状況を教えてください。", deepening: false },
  { id: "q5", text: "転職の時期の目安はいつ頃をお考えですか？", deepening: false },
  { id: "q6", text: "現在の年収と希望年収（額面）をお聞かせください。", deepening: false },
  { id: "q7", text: "希望される勤務地を教えてください。", deepening: false },
  { id: "q8", text: "希望される職種または業界を教えてください。", deepening: true },
  { id: "q9", text: "最後に、意気込みや自己PRをお願いします。", deepening: true },
];

const TONE_OPTIONS = [
  { value: "strict", label: "厳格", desc: "プレッシャーを与える緊張感のある面談スタイル", color: "border-red-300 bg-red-50 text-red-700" },
  { value: "standard", label: "標準", desc: "プロフェッショナルで落ち着いた面談スタイル", color: "border-primary/40 bg-primary/5 text-primary" },
  { value: "friendly", label: "フレンドリー", desc: "親しみやすく話しやすい面談スタイル", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
];

const fetchSettings = () => fetch('/api/settings').then(r => r.json());
const saveSettings = (payload) => fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

export default function QuestionSettings() {
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [tone, setTone] = useState("strict");
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: settingsList = [] } = useQuery({ queryKey: ["interview-settings"], queryFn: fetchSettings });

  useEffect(() => {
    if (settingsList.length > 0) {
      const s = settingsList[0];
      setSettingsId(s.id);
      if (s.questions && s.questions.length > 0) setQuestions(s.questions);
      if (s.tone) setTone(s.tone);
    }
  }, [settingsList]);

  const addQuestion = () => {
    if (questions.length >= 15) return;
    setQuestions(prev => [...prev, { id: `q_${Date.now()}`, text: "", deepening: false }]);
  };

  const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));
  const updateQuestion = (id, field, value) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));

  const moveQuestion = (index, direction) => {
    const items = Array.from(questions);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    setQuestions(items);
  };

  const resetToDefault = () => { setQuestions(DEFAULT_QUESTIONS); setTone("strict"); };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveSettings({ id: settingsId, questions, tone, is_active: true });
    if (result.id && !settingsId) setSettingsId(result.id);
    queryClient.invalidateQueries({ queryKey: ["interview-settings"] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">AIトーン設定</h3>
        <p className="text-xs text-muted-foreground mb-4">面接官AIの話し方・雰囲気を選択してください</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TONE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setTone(opt.value)} className={cn("border-2 rounded-xl p-4 text-left transition-all", tone === opt.value ? opt.color : "border-border bg-card hover:bg-muted/30")}>
              <p className={cn("text-sm font-bold mb-1", tone === opt.value ? "" : "text-foreground")}>{opt.label}</p>
              <p className={cn("text-[11px] leading-relaxed", tone === opt.value ? "opacity-80" : "text-muted-foreground")}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-foreground">質問項目</h3>
            <p className="text-xs text-muted-foreground mt-0.5">最大15項目まで（現在: {questions.length}項目）</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefault} className="text-muted-foreground gap-1.5 text-xs">
            <RotateCcw className="w-3 h-3" />デフォルトに戻す
          </Button>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-3 py-2 mb-4">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground">↑↓で並び替え。「深掘り」ONでAIが追加質問します。</p>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveQuestion(index, -1)} disabled={index === 0} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{index + 1}</span>
                <Input value={q.text} onChange={(e) => updateQuestion(q.id, "text", e.target.value)} placeholder="質問文を入力..." className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0" />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Label htmlFor={`d-${q.id}`} className="text-[11px] text-muted-foreground whitespace-nowrap">深掘り</Label>
                  <Switch id={`d-${q.id}`} checked={q.deepening} onCheckedChange={(v) => updateQuestion(q.id, "deepening", v)} className="scale-75" />
                </div>
                <button onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1} className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-20"><Trash2 className="w-3.5 h-3.5" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 15} className="mt-3 w-full border-dashed gap-2 text-muted-foreground">
          <Plus className="w-4 h-4" />質問を追加（{questions.length}/15）
        </Button>
      </div>
      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          <Save className="w-4 h-4" />{saving ? "保存中..." : saved ? "保存しました ✓" : "保存する"}
        </Button>
      </div>
    </div>
  );
}
