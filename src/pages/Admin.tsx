import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, ShoppingCart, CreditCard, Coins, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProfileRow {
  id: string;
  business_name: string;
  plan: string;
  credits_balance: number;
  trial_ends_at: string | null;
  store_slug: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  user_id: string;
  reference: string;
  plan: string;
  amount_kobo: number;
  status: string;
  created_at: string;
}

interface OrderRow {
  id: string;
  user_id: string;
  customer_name: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<ProfileRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, pay, o] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, business_name, plan, credits_balance, trial_ends_at, store_slug, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("payments")
        .select("id, user_id, reference, plan, amount_kobo, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("orders")
        .select("id, user_id, customer_name, amount, status, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (p.error) toast.error("Failed to load users: " + p.error.message);
    if (pay.error) toast.error("Failed to load payments: " + pay.error.message);
    if (o.error) toast.error("Failed to load orders: " + o.error.message);
    setProfiles((p.data as ProfileRow[]) ?? []);
    setPayments((pay.data as PaymentRow[]) ?? []);
    setOrders((o.data as OrderRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const totalRevenue = payments
      .filter((p) => p.status === "success" || p.status === "verified")
      .reduce((s, p) => s + p.amount_kobo, 0);
    return {
      users: profiles.length,
      orders: orders.length,
      payments: payments.length,
      revenue: totalRevenue / 100,
    };
  }, [profiles, payments, orders]);

  const businessName = (id: string) =>
    profiles.find((p) => p.id === id)?.business_name || "Unknown";

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    const amount = parseInt(adjustAmount, 10);
    if (!amount || isNaN(amount)) {
      toast.error("Enter a non-zero credit amount (negative to deduct).");
      return;
    }
    setAdjusting(true);
    const { error } = await supabase.rpc("admin_adjust_credits", {
      p_user_id: adjustTarget.id,
      p_amount: amount,
      p_reason: adjustReason || "manual adjustment",
    });
    setAdjusting(false);
    if (error) {
      toast.error("Adjustment failed: " + error.message);
      return;
    }
    toast.success(`Adjusted ${adjustTarget.business_name || "user"} by ${amount} credits.`);
    setAdjustTarget(null);
    setAdjustAmount("");
    setAdjustReason("");
    load();
  };

  if (adminLoading) {
    return <div className="p-8 text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          This area is only available to Maniflow administrators. If you believe this is a
          mistake, contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Overview of all stores, payments, and orders across Maniflow.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.users}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.orders}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.payments}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            ₦{stats.revenue.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.business_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.plan === "free" ? "secondary" : "default"}>
                            {p.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.credits_balance.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.store_slug ? `/${p.store_slug}` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setAdjustTarget(p)}>
                            Adjust credits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No payments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{businessName(p.user_id)}</TableCell>
                        <TableCell>{p.plan}</TableCell>
                        <TableCell>₦{(p.amount_kobo / 100).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === "success" || p.status === "verified"
                                ? "default"
                                : p.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.reference}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{businessName(o.user_id)}</TableCell>
                        <TableCell>{o.customer_name || "—"}</TableCell>
                        <TableCell>₦{Number(o.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{o.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={o.payment_status === "paid" ? "default" : "secondary"}
                          >
                            {o.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(o.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust credits</DialogTitle>
            <DialogDescription>
              {adjustTarget?.business_name || "This user"} currently has{" "}
              {adjustTarget?.credits_balance.toLocaleString()} credits. Use a negative number to
              deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Amount (e.g. 500 or -200)"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
            <Input
              placeholder="Reason (optional)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
