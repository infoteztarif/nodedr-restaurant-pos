"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface Department {
  id: string;
  name: string;
  code: string;
  moduleKey?: string;
  isActive: boolean;
  _count: { users: number; roles: number };
}
interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}
interface AccessData {
  departments: Department[];
  modules: { moduleKey: string; enabled: boolean }[];
  users: CompanyUser[];
}
const MODULES = [
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

export default function CompanyAccessPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["company-access"],
    queryFn: () => api.get<AccessData>("/company/access"),
  });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [moduleKey, setModuleKey] = useState("POS");
  const create = useMutation({
    mutationFn: () =>
      api.post("/company/access/departments", { name, code, moduleKey }),
    onSuccess: async () => {
      setName("");
      setCode("");
      toast.success("Department created");
      await qc.invalidateQueries({ queryKey: ["company-access"] });
    },
  });
  const assign = useMutation({
    mutationFn: (input: { departmentId: string; userId: string }) =>
      api.post(`/company/access/departments/${input.departmentId}/users`, {
        userId: input.userId,
      }),
    onSuccess: async () => {
      toast.success("User assigned");
      await qc.invalidateQueries({ queryKey: ["company-access"] });
    },
  });
  const enabled = new Set(
    data?.modules.filter((m) => m.enabled).map((m) => m.moduleKey),
  );
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Department and module access
        </p>
      </div>
      <SettingsTabs />
      <Card className="p-6">
        <h2 className="text-lg font-medium">Create department</h2>
        <p className="text-sm text-muted-foreground">
          Departments can only use modules licensed by the Platform Super Admin.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Department name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Select
            value={moduleKey}
            onValueChange={(value) => value && setModuleKey(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODULES.filter((m) => enabled.size === 0 || enabled.has(m)).map(
                (m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Button
            disabled={!name.trim() || !code.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create department
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.departments.map((department) => (
          <Card key={department.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{department.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {department.code} · {department._count.users} users
                </p>
              </div>
              <Badge variant="outline">
                {department.moduleKey ?? "General"}
              </Badge>
            </div>
            <div className="mt-4">
              <Select
                onValueChange={(userId) => {
                  if (typeof userId === "string")
                    assign.mutate({ departmentId: department.id, userId });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign user" />
                </SelectTrigger>
                <SelectContent>
                  {data.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} · {user.role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
