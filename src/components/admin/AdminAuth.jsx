import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin1234";

export default function AdminAuth({ onAuth }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "1");
      onAuth();
    } else {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">管理者ログイン</h1>
          <p className="text-sm text-muted-foreground mt-1">面談管理システム</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder="パスワードを入力" value={password} onChange={(e) => setPassword(e.target.value)} className={`pl-10 ${error ? "border-destructive" : ""}`} autoFocus />
          </div>
          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive text-center">パスワードが正しくありません</motion.p>}
          <Button type="submit" className="w-full" disabled={!password}>ログイン</Button>
        </form>
      </motion.div>
    </div>
  );
}
