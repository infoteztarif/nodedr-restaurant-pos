"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  PackageSearch,
  Send,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "@/hooks/use-branch";
import { api, ApiError } from "@/lib/api";

type JsonResult = Record<string, unknown>;

function Result({ value }: { value?: JsonResult }) {
  if (!value)
    return (
      <p className="text-sm text-muted-foreground">No analysis loaded yet.</p>
    );
  return (
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AiCopilotPage() {
  const { branchId } = useBranch();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<JsonResult>();
  const demand = useQuery({
    queryKey: ["ai", "demand", branchId],
    queryFn: () =>
      api.get<JsonResult>(`/ai/demand-forecast?branchId=${branchId}`),
    enabled: Boolean(branchId),
  });
  const inventory = useQuery({
    queryKey: ["ai", "inventory", branchId],
    queryFn: () =>
      api.get<JsonResult>(`/ai/inventory-forecast?branchId=${branchId}`),
    enabled: Boolean(branchId),
  });
  const menu = useQuery({
    queryKey: ["ai", "menu", branchId],
    queryFn: () =>
      api.get<JsonResult>(`/ai/menu-analysis?branchId=${branchId}`),
    enabled: Boolean(branchId),
  });
  const ask = useMutation({
    mutationFn: () =>
      api.post<JsonResult>("/ai/ask-report", { branchId, question }),
    onSuccess: (value) => {
      setAnswer(value);
      setQuestion("");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Copilot request failed",
      ),
  });

  return (
    <div className="grid gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          <h1 className="text-[32px] font-semibold tracking-tight">
            Management Copilot
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask business questions and review demand, stock and menu insights.
        </p>
      </header>
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="text-primary" />
          <h2 className="text-lg font-medium">Ask your restaurant data</h2>
        </div>
        <Textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: Show this month's sales trend and the items I should promote."
        />
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!branchId || !question.trim() || ask.isPending}
            onClick={() => ask.mutate()}
          >
            <Send />
            {ask.isPending ? "Analysing…" : "Ask Copilot"}
          </Button>
        </div>
        {answer ? (
          <div className="mt-4">
            <Result value={answer} />
          </div>
        ) : null}
      </Card>
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="text-primary" />
            <h2 className="font-medium">Demand forecast</h2>
          </div>
          <Result value={demand.data} />
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <PackageSearch className="text-primary" />
            <h2 className="font-medium">Inventory forecast</h2>
          </div>
          <Result value={inventory.data} />
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Utensils className="text-primary" />
            <h2 className="font-medium">Menu engineering</h2>
          </div>
          <Result value={menu.data} />
        </Card>
      </section>
    </div>
  );
}
