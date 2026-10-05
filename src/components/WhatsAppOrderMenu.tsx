import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orderTemplates, waUrl, type OrderLike } from "@/lib/whatsapp";

export default function WhatsAppOrderMenu({ order, phone, business }: { order: OrderLike; phone: string; business: string }) {
  if (!phone) return null;
  const templates = orderTemplates(order, business);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-success" aria-label="Message buyer on WhatsApp">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Message {order.customer_name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => window.open(waUrl(t.text, phone), "_blank", "noopener")}>
            {t.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open(waUrl("", phone), "_blank", "noopener")}>Blank message</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
