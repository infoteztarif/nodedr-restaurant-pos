"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  IndianRupee,
  Layers3,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ApiError, platformApi } from "@/lib/api";

type ModuleKey =
  | "POS"
  | "KDS"
  | "MENU"
  | "TABLES"
  | "INVENTORY"
  | "PURCHASING"
  | "ACCOUNTING"
  | "HR"
  | "DELIVERY"
  | "CRM"
  | "MARKETING"
  | "REPORTS"
  | "OPERATIONS"
  | "AI";
const MODULES: ModuleKey[] = [
  "POS",
  "KDS",
  "MENU",
  "TABLES",
  "INVENTORY",
  "PURCHASING",
  "ACCOUNTING",
  "HR",
  "DELIVERY",
  "CRM",
  "MARKETING",
  "REPORTS",
  "OPERATIONS",
  "AI",
];
interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
}
interface Tenant {
  id: string;
  name: string;
  status: string;
  _count: { branches: number; users: number };
  tenantModules: { moduleKey: ModuleKey; enabled: boolean }[];
  subscriptions: { plan: Plan; status: string }[];
}
interface Overview {
  tenants: number;
  active: number;
  trial: number;
  pastDue: number;
  monthlyRevenue: number;
}

export default function PlatformDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview>();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [summary, tenantRows, planRows] = await Promise.all([
        platformApi.get<Overview>("/overview"),
        platformApi.get<Tenant[]>("/tenants"),
        platformApi.get<Plan[]>("/plans"),
      ]);
      setOverview(summary);
      setTenants(tenantRows);
      setPlans(planRows);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        router.replace("/platform/login");
      else
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not load platform data",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const cards = useMemo(
    () =>
      [
        ["Companies", overview?.tenants ?? 0, Building2],
        ["Active", overview?.active ?? 0, Users],
        ["Trials", overview?.trial ?? 0, Layers3],
        [
          "Monthly revenue",
          `₹${(overview?.monthlyRevenue ?? 0).toLocaleString("en-IN")}`,
          IndianRupee,
        ],
      ] as const,
    [overview],
  );

  async function setStatus(id: string, status: string) {
    await platformApi.patch(`/tenants/${id}/status`, {
      status,
      reason:
        status === "SUSPENDED"
          ? "Suspended by platform administrator"
          : undefined,
    });
    toast.success("Company status updated");
    await load();
  }
  async function setModule(
    tenant: Tenant,
    moduleKey: ModuleKey,
    enabled: boolean,
  ) {
    await platformApi.patch(`/tenants/${tenant.id}/modules/${moduleKey}`, {
      enabled,
    });
    setTenants((rows) =>
      rows.map((row) =>
        row.id !== tenant.id
          ? row
          : {
              ...row,
              tenantModules: [
                ...row.tenantModules.filter((m) => m.moduleKey !== moduleKey),
                { moduleKey, enabled },
              ],
            },
      ),
    );
  }
  async function setPlan(tenantId: string, planId: string) {
    await platformApi.post(`/tenants/${tenantId}/subscriptions`, { planId });
    toast.success("Subscription plan assigned");
    await load();
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Platform Super Admin</h1>
              <p className="text-sm text-muted-foreground">
                Companies, plans and licensed modules
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("platform_token");
              router.replace("/platform/login");
            }}
          >
            <LogOut /> Logout
          </Button>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, Icon]) => (
            <Card key={label} className="p-5">
              <Icon className="text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{label}</p>
              <p className="text-3xl font-semibold">{value}</p>
            </Card>
          ))}
        </section>
        <section className="grid gap-4">
          {loading ? (
            <Card className="p-8">Loading companies…</Card>
          ) : (
            tenants.map((tenant) => (
              <Card key={tenant.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{tenant.name}</h2>
                      <Badge variant="outline">{tenant.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tenant._count.branches} branches · {tenant._count.users}{" "}
                      users
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={tenant.status}
                      onValueChange={(value) =>
                        value && void setStatus(tenant.id, value)
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "TRIAL",
                          "ACTIVE",
                          "PAST_DUE",
                          "SUSPENDED",
                          "CANCELLED",
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={tenant.subscriptions[0]?.plan.id}
                      onValueChange={(value) =>
                        value && void setPlan(tenant.id, value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {MODULES.map((moduleKey) => {
                    const explicit = tenant.tenantModules.find(
                      (m) => m.moduleKey === moduleKey,
                    );
                    return (
                      <label
                        key={moduleKey}
                        className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs"
                      >
                        <span>{moduleKey}</span>
                        <Switch
                          checked={explicit?.enabled ?? true}
                          onCheckedChange={(enabled) =>
                            void setModule(tenant, moduleKey, enabled)
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
