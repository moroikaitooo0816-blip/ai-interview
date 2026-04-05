import React, { useState } from "react";
import { Interview } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Briefcase, Calendar, CheckCircle, PauseCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ScoreDisplay from "@/components/interview/ScoreDisplay";
import InterviewSummary from "@/components/interview/InterviewSummary";
import TranscriptView from "@/components/interview/TranscriptView";
import AdminAuth from "@/components/admin/AdminAuth";

const REVIEW_OPTIONS = [
  { value: "pass", label: "合格", icon: CheckCircle, className: "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
  { value: "hold", label: "保留", icon: PauseCircle, className: "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100" },
  { value: "fail", label: "不合格", icon: XCircle, className: "border-red-300 text-red-700 bg-red-50 hover:bg-red-100" },
];

const REVIEW_BADGE = {
  pass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  hold: "text-amber-700 bg-amber-50 border-amber-200",
  fail: "text-red-700 bg-red-50 border-red-200",
  pending: "text-slate-500 bg-slate-50 border-slate-200",
};
const REVIEW_LABEL = { pass: "合格", hold: "保留", fail: "不合格", pending: "未審査" };

export default function InterviewDetail() {
  const authed = true; // 認証不要
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const queryClient = useQueryClient();
  const { id: interviewId } = useParams();

  const { data: interview, isLoading } = useQuery({
    queryKey: ["interview", interviewId],
    queryFn: () => Interview.get(interviewId),
    enabled: !!interviewId,
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">面談データが見つかりません</p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    await Interview.update(interviewId, { review_status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["interview", interviewId] });
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    setUpdatingStatus(false);
  };

  const currentReview = interview.review_status || "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />一覧に戻る
          </Button>
        </Link>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{(interview.candidate_name || "?")[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{interview.candidate_name || "名前未確認"}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {interview.created_date ? format(new Date(interview.created_date), "yyyy年MM月dd日 HH:mm", { locale: ja }) : "日時不明"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {interview.score != null && (
              <Badge variant="outline" className={cn("text-sm font-bold px-3 py-1", interview.score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : interview.score >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200")}>
                {interview.score}点
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-xs", REVIEW_BADGE[currentReview])}>{REVIEW_LABEL[currentReview]}</Badge>
          </div>
        </div>

        {interview.status === "completed" && (
          <Card className="p-4 mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider uppercase">審査ステータスを変更</p>
            <div className="flex gap-2 flex-wrap">
              {REVIEW_OPTIONS.map((opt) => (
                <Button key={opt.value} variant="outline" size="sm" disabled={updatingStatus || currentReview === opt.value} onClick={() => handleStatusChange(opt.value)} className={cn("gap-1.5 text-xs", opt.className, currentReview === opt.value && "ring-2 ring-offset-1 ring-current opacity-80")}>
                  <opt.icon className="w-3.5 h-3.5" />{opt.label}{currentReview === opt.value && " ✓"}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {interview.status === "completed" ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="summary">要約</TabsTrigger>
              <TabsTrigger value="score">評価</TabsTrigger>
              <TabsTrigger value="transcript">全文</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <div className="space-y-6">
                <InterviewSummary summaries={interview.summaries} />
                {interview.overall_comment && (
                  <Card className="p-5">
                    <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">AIによる総合コメント</p>
                    <p className="text-sm text-foreground leading-relaxed">{interview.overall_comment}</p>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value="score">
              <ScoreDisplay score={interview.score} scoreBreakdown={interview.score_breakdown} overallComment={interview.overall_comment} />
            </TabsContent>
            <TabsContent value="transcript">
              <TranscriptView messages={interview.messages} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">この面談はまだ進行中です</p>
          </div>
        )}
      </div>
    </div>
  );
}
