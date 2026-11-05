"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChefHat,
  Clock3,
  MapPin,
  PackageCheck,
  ReceiptText,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TrackingOrder = {
  orderNumber: string;
  restaurantName: string;
  branchName: string;
  logoUrl: string | null;
  currency: string;
  type: string;
  status: string;
  acceptance: string;
  deliveryStatus: string | null;
  deliveryEtaAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  totalAmount: string;
  paid: boolean;
  items: { name: string; quantity: number; lineTotal: string; status: string }[];
};

const itemLabel: Record<string, string> = {
  NEW: "Received",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

function stage(order: TrackingOrder) {
  if (order.status === "CANCELLED") return 0;
  if (order.status === "PAID" || order.deliveryStatus === "DELIVERED") return 4;
  if (order.deliveryStatus === "PICKED_UP") return 3;
  if (order.items.some((item) => item.status === "READY" || item.status === "SERVED")) return 3;
  if (order.items.some((item) => item.status === "PREPARING")) return 2;
  return 1;
}

const stages = [
  { label: "Order received", icon: ReceiptText },
  { label: "Kitchen preparing", icon: ChefHat },
  { label: "Ready / on the way", icon: Truck },
  { label: "Completed", icon: PackageCheck },
];

export default function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-order-tracking", token],
    queryFn: () => api.get<TrackingOrder>(`/public/track/${token}`),
    refetchInterval: 8000,
    retry: false,
  });

  if (isLoading) {
    return <main className="mx-auto min-h-screen max-w-xl space-y-4 bg-background p-4 pt-10"><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-44 rounded-3xl" /></main>;
  }
  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md rounded-3xl p-8 text-center shadow-lg">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Tracking unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof ApiError ? error.message : "Please check the link or contact the restaurant."}</p>
        </Card>
      </main>
    );
  }

  const current = stage(data);
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-background to-background px-4 py-8 dark:from-orange-950/20">
      <div className="mx-auto grid max-w-xl gap-4">
        <Card className="overflow-hidden rounded-3xl border-orange-200/70 shadow-sm">
          <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-6 text-white">
            <div className="flex items-center gap-3">
              {data.logoUrl ? <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-2xl bg-white object-contain p-1" /> : <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Store /></div>}
              <div><h1 className="text-xl font-bold">{data.restaurantName}</h1><p className="flex items-center gap-1 text-sm text-white/85"><MapPin className="h-3.5 w-3.5" />{data.branchName}</p></div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-white/75">Order</p><p className="text-2xl font-bold">#{data.orderNumber}</p></div><Badge className="bg-white text-orange-700 hover:bg-white">{data.paid ? "Paid" : "Payment pending"}</Badge></div>
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Live status</h2><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Auto-updates</span></div>
          <div className="grid gap-4">
            {stages.map(({ label, icon: Icon }, index) => {
              const done = current >= index + 1;
              return <div key={label} className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-full ${done ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground"}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div><div className="flex-1"><p className={done ? "font-medium" : "text-muted-foreground"}>{label}</p>{index === current - 1 && <p className="text-xs text-orange-600">Current status</p>}</div></div>;
            })}
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Your order</h2>
          <div className="grid gap-3">{data.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><div><p className="font-medium">{item.quantity} × {item.name}</p><p className="text-xs text-muted-foreground">{itemLabel[item.status] ?? item.status}</p></div><p className="font-medium">{data.currency} {Number(item.lineTotal).toLocaleString()}</p></div>)}</div>
          <div className="mt-5 flex items-center justify-between border-t pt-4 text-lg font-bold"><span>Total</span><span>{data.currency} {Number(data.totalAmount).toLocaleString()}</span></div>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Status refreshes every 8 seconds. Keep this private link to track your order.</p>
      </div>
    </main>
  );
}
