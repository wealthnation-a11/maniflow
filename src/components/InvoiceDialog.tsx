import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";

interface OrderData {
  id: string;
  customer: string;
  phone: string;
  product: string;
  amount: string;
  amountNum: number;
  platform: string;
  status: string;
  payment: string;
}

interface InvoiceDialogProps {
  order: OrderData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvoiceDialog({ order, open, onOpenChange }: InvoiceDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { logoUrl, businessName } = useBusiness();

  if (!order) return null;

  const date = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  const invoiceNo = `INV-${order.id.replace("#ORD-", "")}`;

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${invoiceNo}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 700px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; }
        .logo { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
        .logo-placeholder { width: 64px; height: 64px; border-radius: 12px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #9ca3af; }
        .biz-name { font-size: 20px; font-weight: 700; }
        .invoice-title { font-size: 28px; font-weight: 800; color: #6366f1; text-align: right; }
        .invoice-meta { text-align: right; font-size: 13px; color: #6b7280; margin-top: 4px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; font-weight: 600; }
        .detail { font-size: 14px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { background: #f9fafb; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #e5e7eb; border-bottom: none; }
        .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        .status-paid { background: #dcfce7; color: #16a34a; }
        .status-pending { background: #fef3c7; color: #d97706; }
        .status-failed { background: #fce4ec; color: #dc2626; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>${content.innerHTML}
      <div class="footer">Thank you for your business! — ${businessName}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const paymentClass = order.payment === "paid" ? "status-paid" : order.payment === "pending" ? "status-pending" : "status-failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoiceNo}</span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "2px solid hsl(var(--border))", paddingBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Business Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>
                  {businessName.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{businessName}</div>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Powered by AutoServe</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "hsl(var(--primary))" }}>INVOICE</div>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>{invoiceNo}</div>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{date}</div>
            </div>
          </div>

          {/* Customer details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-foreground))", marginBottom: 6, fontWeight: 600 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{order.customer}</div>
            <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>{order.phone}</div>
            <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>via {order.platform}</div>
          </div>

          {/* Items table */}
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", margin: "16px 0" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid hsl(var(--border))" }}>
                <th className="text-left p-2.5 text-xs uppercase text-muted-foreground font-semibold bg-muted/50">Item</th>
                <th className="text-center p-2.5 text-xs uppercase text-muted-foreground font-semibold bg-muted/50">Qty</th>
                <th className="text-right p-2.5 text-xs uppercase text-muted-foreground font-semibold bg-muted/50">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <td className="p-3">{order.product}</td>
                <td className="p-3 text-center">1</td>
                <td className="p-3 text-right font-medium">{order.amount}</td>
              </tr>
              <tr>
                <td className="p-3 font-bold" colSpan={2} style={{ borderTop: "2px solid hsl(var(--border))" }}>Total</td>
                <td className="p-3 text-right font-bold text-base" style={{ borderTop: "2px solid hsl(var(--border))" }}>{order.amount}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Payment Status: </span>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                order.payment === "paid" ? "bg-success/10 text-success" : order.payment === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              }`}>{order.payment}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Order Status: </span>
              <span className="text-sm font-medium capitalize">{order.status}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
