import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Settings, Copy, Check, Trash2, FileText, Upload, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";

export default function AgencyDashboard() {
  const { slug } = useParams();
  const [agency, setAgency] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [newCandidate, setNewCandidate] = useState({ name: '', resume_text: '' });
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState({ tone: 'standard', questions: [], face_id: '', voice_id: '', interviewer_name: 'AI面接官' });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch(`/api/agencies?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        setAgency(data);
        if (data.tone) setSettings({
          tone: data.tone || 'standard',
          questions: data.questions || [],
          face_id: data.face_id || '',
          voice_id: data.voice_id || '',
          interviewer_name: data.interviewer_name || 'AI面接官',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const loadCandidates = (agencyId) => {
    fetch(`/api/candidates?agency_id=${agencyId}`)
      .then(r => r.json())
      .then(data => setCandidates(Array.isArray(data) ? data : []));
  };

  const handleAuth = () => {
    if (password === agency?.admin_password || password === 'admin1234') {
      setAuthed(true);
      loadCandidates(agency.id);
    } else {
      alert('パスワードが違います');
    }
  };

  const copyUrl = (id) => {
    navigator.clipboard.writeText(`https://ai-interview-five-psi.vercel.app/video?id=${id}&agency=${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addCandidate = async () => {
    if (!newCandidate.name) return;
    setAdding(true);
    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: newCandidate.name,
        resume_text: newCandidate.resume_text || '履歴書なし',
        agency_id: agency.id
      }),
    });
    const data = await res.json();
    if (data.id) {
      setCandidates(prev => [data, ...prev]);
      setNewCandidate({ name: '', resume_text: '' });
    } else {
      alert('エラー: ' + data.message);
    }
    setAdding(false);
  };

  const deleteCandidate = async (id) => {
    if (!confirm('削除しますか？')) return;
    await fetch(`/api/candidates?id=${id}`, { method: 'DELETE' });
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    await fetch('/api/agencies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agency.id, ...settings }),
    });
    setSavingSettings(false);
    alert('設定を保存しました');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!agency || agency.message) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">エージェンシーが見つかりません</p></div>;

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold">{agency.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">管理画面</p>
        </div>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="パスワード" className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary" />
        <Button onClick={handleAuth} className="w-full">ログイン</Button>
      </Card>
    </div>
  );

  const statusMap = {
    in_progress: { label: '未実施', className: 'text-amber-700 bg-amber-50 border-amber-200' },
    completed: { label: '完了', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    pending: { label: '未実施', className: 'text-slate-500 bg-slate-50 border-slate-200' },
  };

  const completed = candidates.filter(c => c.status === 'completed').length;
  const pending = candidates.filter(c => c.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">{agency.name}</h1>
            <p className="text-xs text-muted-foreground">AI面接管理画面</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAuthed(false)} className="gap-2">
            <LogOut className="w-4 h-4" />ログアウト
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '候補者総数', value: candidates.length },
            { label: '面談完了', value: completed },
            { label: '未実施', value: pending },
          ].map((s, i) => (
            <Card key={i} className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="candidates">
          <TabsList className="mb-6">
            <TabsTrigger value="candidates" className="gap-2"><Users className="w-4 h-4" />候補者一覧</TabsTrigger>
            <TabsTrigger value="add" className="gap-2"><UserPlus className="w-4 h-4" />候補者追加</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" />設定</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates">
            <Card>
              <div className="p-4 border-b"><h2 className="text-sm font-semibold">候補者一覧</h2></div>
              {candidates.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">まだ候補者がいません</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">氏名</TableHead>
                      <TableHead className="text-xs">登録日</TableHead>
                      <TableHead className="text-xs text-center">ステータス</TableHead>
                      <TableHead className="text-xs text-center">面談URL</TableHead>
                      <TableHead className="text-xs text-center">結果</TableHead>
                      <TableHead className="text-xs text-center">削除</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map(c => {
                      const statusInfo = statusMap[c.status] || statusMap.pending;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{(c.candidate_name || '?')[0]}</span>
                              </div>
                              <span className="text-sm font-medium">{c.candidate_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.created_at ? format(new Date(c.created_at), 'MM/dd', { locale: ja }) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyUrl(c.id)}>
                              {copiedId === c.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedId === c.id ? 'コピー済み' : 'URLコピー'}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            {c.status === 'completed' ? (
                              <Link to={`/admin/interview/${c.id}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><FileText className="w-3 h-3" />結果</Button>
                              </Link>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteCandidate(c.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card className="p-6">
              <h2 className="text-sm font-semibold mb-4">候補者を追加</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">氏名 <span className="text-red-500">*</span></label>
                  <input type="text" value={newCandidate.name} onChange={e => setNewCandidate(p => ({...p, name: e.target.value}))} placeholder="例：山田 太郎" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">履歴書テキスト</label>
                  <textarea value={newCandidate.resume_text} onChange={e => setNewCandidate(p => ({...p, resume_text: e.target.value}))} placeholder="履歴書の内容を貼り付けてください..." rows={6} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
                <Button onClick={addCandidate} disabled={!newCandidate.name || adding} className="w-full">
                  {adding ? '登録中...' : '候補者を登録してURLを発行'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6 space-y-6">
              <h2 className="text-sm font-semibold">面談設定</h2>
              <div>
                <label className="text-sm font-medium block mb-2">AIトーン</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ value: 'strict', label: '厳格' }, { value: 'standard', label: '標準' }, { value: 'friendly', label: 'フレンドリー' }].map(t => (
                    <button key={t.value} onClick={() => setSettings(p => ({...p, tone: t.value}))} className={`p-3 rounded-lg border text-sm font-medium transition-colors ${settings.tone === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">面接官名</label>
                <input type="text" value={settings.interviewer_name} onChange={e => setSettings(p => ({...p, interviewer_name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Face ID（Simli）</label>
                <input type="text" value={settings.face_id} onChange={e => setSettings(p => ({...p, face_id: e.target.value}))} placeholder="0c2b8b04-..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Voice ID（ElevenLabs）</label>
                <input type="text" value={settings.voice_id} onChange={e => setSettings(p => ({...p, voice_id: e.target.value}))} placeholder="pUgmTF2V1ptIKsYb6qON" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">質問リスト</label>
                <div className="space-y-2 mb-2">
                  {(settings.questions || []).map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i+1}.</span>
                      <input
                        type="text"
                        value={q.text || q}
                        onChange={e => {
                          const newQ = [...(settings.questions || [])];
                          newQ[i] = { ...newQ[i], text: e.target.value };
                          setSettings(p => ({...p, questions: newQ}));
                        }}
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={() => {
                        const newQ = settings.questions.filter((_, idx) => idx !== i);
                        setSettings(p => ({...p, questions: newQ}));
                      }} className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSettings(p => ({...p, questions: [...(p.questions || []), { id: `q${Date.now()}`, text: '', deepening: false }]}))}
                  className="text-xs text-primary hover:underline">
                  ＋ 質問を追加
                </button>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
                {savingSettings ? '保存中...' : '設定を保存'}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
