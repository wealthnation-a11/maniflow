import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_MB = 5;

export default function PaymentProofForm({
  trackingCode,
  amount,
  proofStatus,
  reviewNote,
  onSubmitted,
}: {
  trackingCode: string;
  amount: number;
  proofStatus: string | null;
  reviewNote: string | null;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState(String(amount ?? ""));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only PNG, JPG or WEBP screenshots are supported");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — please use one under ${MAX_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setFileName(file.name); };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!image) { toast.error("Please attach your payment screenshot"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("submit-payment-proof", {
      body: {
        tracking_code: trackingCode,
        image,
        note: note.trim(),
        amount_claimed: Number(amountPaid) || amount,
      },
    });
    setBusy(false);
    const err = (data as any)?.error || (error ? "Could not send your proof. Please try again." : null);
    if (err) { toast.error(err); return; }
    toast.success("Proof sent — the store owner will confirm shortly");
    setImage(null); setFileName(""); setNote(""); setOpen(false);
    onSubmitted();
  };

  if (proofStatus === "pending") {
    return (
      <div className="rounded-lg border bg-warning/10 p-3 flex items-start gap-2">
        <Clock className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold">Proof received — awaiting confirmation</p>
          <p className="text-[11px] text-muted-foreground">The store owner is reviewing your payment. This page updates automatically once it's approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {proofStatus === "rejected" ? (
        <div className="rounded-lg border bg-destructive/10 p-3 flex items-start gap-2">
          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Your proof was not accepted</p>
            <p className="text-[11px] text-muted-foreground">{reviewNote || "Please upload a clearer screenshot of the transfer."}</p>
          </div>
        </div>
      ) : null}

      {!open ? (
        <Button className="w-full text-sm" variant="outline" onClick={() => setOpen(true)}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          I've made the payment
        </Button>
      ) : (
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs font-semibold">Send proof of payment</p>

          <div>
            <Label className="text-xs">Amount you paid</Label>
            <Input
              value={amountPaid}
              inputMode="numeric"
              onChange={(e) => setAmountPaid(e.target.value.replace(/[^\d.]/g, ""))}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Payment screenshot *</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
            />
            {image ? (
              <div className="relative mt-1 inline-block">
                <img src={image} alt="Payment receipt preview" className="h-28 w-auto rounded-lg border object-cover" />
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  onClick={() => { setImage(null); setFileName(""); }}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[160px]">{fileName}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-1 w-full text-xs" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Choose screenshot
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG or WEBP · max {MAX_MB}MB</p>
          </div>

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Bank used, sender name, reference…"
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button className="flex-1 gradient-primary text-primary-foreground text-sm" disabled={busy || !image} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send proof
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
