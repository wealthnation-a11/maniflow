import { Home, ShoppingBag, MessageCircle, Truck } from "lucide-react";

type Props = {
  onHome: () => void;
  onProducts: () => void;
  onChat: () => void;
  onTrack: () => void;
  active?: "home" | "products" | "chat" | "track";
};

export default function StoreBottomNav({ onHome, onProducts, onChat, onTrack, active }: Props) {
  const items = [
    { key: "home", label: "Home", icon: Home, onClick: onHome },
    { key: "products", label: "Products", icon: ShoppingBag, onClick: onProducts },
    { key: "chat", label: "Chat", icon: MessageCircle, onClick: onChat },
    { key: "track", label: "Track order", icon: Truck, onClick: onTrack },
  ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur" aria-label="Store navigation">
      <div className="max-w-5xl mx-auto grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
