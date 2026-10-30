"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, platformApi } from "@/lib/api";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await platformApi.post<{ accessToken: string }>(
        "/auth/login",
        {
          email,
          password,
        },
      );
      localStorage.setItem("platform_token", result.accessToken);
      router.replace("/platform");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not sign in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#fff1f2,transparent_45%)] p-4 dark:bg-none">
      <Card className="w-full max-w-md gap-6 p-8 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Teztarif Platform</h1>
            <p className="text-sm text-muted-foreground">Super Admin console</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
