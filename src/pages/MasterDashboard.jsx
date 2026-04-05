import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Plus, ExternalLink, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function MasterDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("master_auth") === "1");
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', slug: '', admin_password: 'admin1234' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (authed) {
      fetch('/api/companies')
        .then(r => r.json())
        .then(data => { setCompanies(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [authed]);

  const handleAuth = () => {
    if (password === 'master1234') {
      sessionStorage.setItem("master_auth", "1");
      setAuthed(true);
    } else {
      alert('パスワードが違います');
    }
  };

  const addCompany = async () => {
    if (!newCompany.name || !newCompany.slug) return;
    setAdding(true);
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCompany),
    });
    const data = await res.json();
    if (data.id) {
      setCompanies(prev => [data, ...prev]);
      setNewCompany({ name: '', slug: '', admin_password: 'admin1234' });
      setShowAdd(false);
    } else {
      alert('エラー: ' + data.message);
    }
    setAdding(false);
  };

  const deleteCompany = async (id) => {
    if (!confirm('この企業を削除しますか？')) return;
    await fetch(`/api/companies?id=${id}`, { method: 'DELETE' });
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold">マスター管理画面</h1>
          <p className="text-xs text-muted-foreground mt-1">AiDoru 人材紹介管理システム</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          placeholder="マスターパスワード"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button onClick={handleAuth} className="w-full">ログイン</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">マスター管理画面</h1>
              <p className="text-xs text-muted-foreground">クライアント企業一覧</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />企業を追加
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem("master_auth"); setAuthed(false); }}>
              ログアウト
            </Button>
          </div>
        </div>

        {showAdd && (
          <Card className="p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4">新規クライアント企業を追加</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1">企業名 *</label>
                <input type="text" value={newCompany.name} onChange={e => setNewCompany(p => ({...p, name: e.target.value}))} placeholder="株式会社〇〇" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">URL識別子 *</label>
                <input type="text" value={newCompany.slug} onChange={e => setNewCompany(p => ({...p, slug: e.target.value.toLowerCase().replace(/\s/g, '-')}))} placeholder="company-abc" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-xs text-muted-foreground mt-1">/company/{newCompany.slug || 'xxx'}</p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">管理パスワード</label>
                <input type="text" value={newCompany.admin_password} onChange={e => setNewCompany(p => ({...p, admin_password: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addCompany} disabled={!newCompany.name || !newCompany.slug || adding}>
                {adding ? '追加中...' : '追加'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>キャンセル</Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">読み込み中...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">まだ企業が登録されていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company, i) => (
              <motion.div key={company.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{company.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{company.name}</p>
                        <p className="text-xs text-muted-foreground">/{company.slug}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteCompany(company.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/company/${company.slug}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1">
                        <Users className="w-3 h-3" />管理画面
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigator.clipboard.writeText(`https://ai-interview-five-psi.vercel.app/company/${company.slug}`)}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
