import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

type Props = {
  platform: string | null;
  verifyToken?: string;
  onClose: () => void;
  onConnected: (conn: any) => void;
};

const names: Record<string, string> = { whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram" };

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input readOnly value={value} className="text-xs font-mono" />
        <Button type="button" size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ManualConnectDialog({ platform, verifyToken, onClose, onConnected }: Props) {
  const [token, setToken] = useState("");
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [busy, setBusy] = useState(false);
  const isWa = platform === "whatsapp";

  const submit = async () => {
    if (!platform) return;
    setBusy(true);
    const body: Record<string, string> = { platform, access_token: token };
    if (isWa) { body.phone_number_id = id1; body.business_account_id = id2; } else { body.page_id = id1; }
    const { data, error } = await supabase.functions.invoke("meta-manual-connect", { body });
    setBusy(false);
    let msg = data?.error as string | undefined;
    if (error && !msg) {
      try { msg = (await (error as any).context?.json())?.error; } catch { /* ignore */ }
    }
    if (error || !data?.ok) { toast.error(msg || error?.message || "Could not connect"); return; }
    toast.success(`${names[platform]} connected: ${data.label}`);
    (data.warnings || []).forEach((w: string) => toast.warning(w));
    onConnected(data.connection);
    setToken(""); setId1(""); setId2("");
  };

  return (
    <Dialog open={!!platform} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect {platform ? names[platform] : ""} with API keys</DialogTitle>
          <DialogDescription>
            Paste the details from your Meta dashboard. We check them with Meta before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{isWa ? "Phone Number ID" : "Facebook Page ID"}</Label>
            <Input value={id1} onChange={(e) => setId1(e.target.value.replace(/\s/g, ""))} placeholder="e.g. 1234567890" className="mt-1" />
            <p className="text-[11px] text-muted-foreground mt-1">
              {isWa ? "WhatsApp Manager → API Setup → Phone number ID." : platform === "instagram" ? "The Facebook Page your Instagram professional account is linked to (Page → About → Page transparency)." : "Your Page → About → Page transparency → Page ID."}
            </p>
          </div>
          {isWa && (
            <div>
              <Label className="text-xs">WhatsApp Business Account ID</Label>
              <Input value={id2} onChange={(e) => setId2(e.target.value.replace(/\s/g, ""))} placeholder="e.g. 9876543210" className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">Shown on the same API Setup page.</p>
            </div>
          )}
          <div>
            <Label className="text-xs">{isWa ? "Permanent access token" : "Page access token"}</Label>
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="EAAG..." className="mt-1" />
            <p className="text-[11px] text-muted-foreground mt-1">
              {isWa ? "Business Settings → System users → Generate token (tick whatsapp_business_messaging & management)." : "Graph API Explorer → choose your Page → Generate access token. Use a long-lived token so it doesn't expire."}
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-2">
            <p className="text-xs font-medium">Then add this in your Meta app → Webhooks:</p>
            <CopyRow label="Callback URL" value={`${FN_BASE}/${isWa ? "whatsapp-webhook" : "meta-webhook"}`} />
            {verifyToken ? (
              <CopyRow label="Verify token" value={verifyToken} />
            ) : (
              <p className="text-[11px] text-muted-foreground">Your verify token appears here after you save.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Subscribe to: {isWa ? "messages" : platform === "facebook" ? "messages, messaging_postbacks, feed" : "messages, comments"}
            </p>
          </div>

          <Button className="w-full gradient-primary text-primary-foreground" disabled={busy || !token || !id1 || (isWa && !id2)} onClick={submit}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking with Meta…</> : "Test & Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
