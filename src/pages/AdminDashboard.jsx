import React, { useState } from "react";
import { Interview } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, BarChart3, Briefcase, LogOut, ExternalLink, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import AdminAuth from "@/components/admin/AdminAuth";
import QuestionSettings from "@/components/admin/QuestionSettings";

const REVIEW_STATUS_MAP = {
  pass: { label: "合格", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  hold: { label: "保留", className: "text-amber-700 bg-amber-50 border-amber-200" },
  fail: { label: "不合格", className: "text-red-700 bg-red-50 border-red-200" },
  pending: { label: "未審査", className: "text-slate-500 bg-slate-50 border-slate-200" },
};

function getScoreBadge(score) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "1");

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => Interview.list(),
    enabled: authed,
  });

  if (!authed) return <AdminAuth onAuth={() => setAuthed(true)} />;

  const completed = interviews.filter(i => i.status === "completed");
  const inProgress = interviews.filter(i => i.status === "in_progress");
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, i) => sum + (i.score || 0), 0) / completed.length) : 0;

  const stats = [
    { label: "総面談数", value: interviews.length, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "完了", value: completed.length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "進行中", value: inProgress.length, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "平均スコア", value: `${avgScore}点`, icon: BarChart3, color: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">面談管理</h1>
              <p className="text-xs text-muted-foreground">AI初回面談の結果一覧</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem("admin_auth"); setAuthed(false); }} className="text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" />ログアウト
          </Button>
        </div>

        <Tabs defaultValue="interviews" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="interviews" className="gap-2"><Users className="w-4 h-4" />面談一覧</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" />質問設定</TabsTrigger>
          </TabsList>

          <TabsContent value="interviews">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {stats.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.color)}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-bold text-foreground">{isLoading ? "-" : stat.value}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            <Card>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">面談済み候補者一覧</h2>
              </div>
              {isLoading ? (
                <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : interviews.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">まだ面談データがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">氏名</TableHead>
                        <TableHead className="text-xs font-semibold">面談日時</TableHead>
                        <TableHead className="text-xs font-semibold text-center">総合スコア</TableHead>
                        <TableHead className="text-xs font-semibold text-center">面談ステータス</TableHead>
                        <TableHead className="text-xs font-semibold text-center">審査ステータス</TableHead>
                        <TableHead className="text-xs font-semibold text-center">詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviews.map((interview, i) => {
                        const reviewInfo = REVIEW_STATUS_MAP[interview.review_status || "pending"];
                        return (
                          <motion.tr key={interview.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary">{(interview.candidate_name || "?")[0]}</span>
                                </div>
                                <span className="text-sm font-medium">{interview.candidate_name || "名前未確認"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {interview.created_date ? format(new Date(interview.created_date), "yyyy/MM/dd HH:mm", { locale: ja }) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {interview.status === "completed" && interview.score != null ? (
                                <Badge variant="outline" className={cn("text-xs font-bold", getScoreBadge(interview.score))}>{interview.score}点</Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-xs", interview.status === "completed" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200")}>
                                {interview.status === "completed" ? "完了" : "進行中"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-xs", reviewInfo.className)}>{reviewInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Link to={`/admin/interview/${interview.id}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><ExternalLink className="w-3 h-3" />詳細</Button>
                              </Link>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6"><QuestionSettings /></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
