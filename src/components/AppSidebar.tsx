import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarCounts } from "@/hooks/useSidebarCounts";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  Bot,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import ManyFlowLogo from "./ManyFlowLogo";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", badgeKey: null },
  { label: "Inbox", icon: MessageSquare, path: "/inbox", badgeKey: "inbox" as const },
  { label: "Bot Config", icon: Bot, path: "/bot-config", badgeKey: null },
  { label: "AI Assistant", icon: Sparkles, path: "/chat", badgeKey: null },
  { label: "Products", icon: Package, path: "/products", badgeKey: null },
  { label: "Orders", icon: ShoppingCart, path: "/orders", badgeKey: null },
  { label: "Customers", icon: Users, path: "/customers", badgeKey: null },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns", badgeKey: null },
  { label: "Notifications", icon: Bell, path: "/notifications", badgeKey: "notifications" as const },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl, businessName } = useBusiness();
  const { signOut } = useAuth();
  const counts = useSidebarCounts();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getBadgeCount = (badgeKey: string | null): number => {
    if (!badgeKey) return 0;
    return counts[badgeKey as keyof typeof counts] ?? 0;
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <ManyFlowLogo className="h-6 w-6" />
          <span className="font-heading font-bold text-sidebar-foreground text-lg">ManyFlow</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/inbox" className="relative p-1 text-sidebar-foreground">
            <Bell className="h-5 w-5" />
            {counts.inbox > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full gradient-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {counts.inbox > 99 ? "99+" : counts.inbox}
              </span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground p-1">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <ManyFlowLogo className="h-7 w-7" />
          )}
          <span className="font-heading font-bold text-sidebar-foreground text-xl tracking-tight">{businessName}</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const badgeCount = getBadgeCount(item.badgeKey);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="gradient-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <ThemeToggle />
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              location.pathname === "/settings"
                ? "bg-sidebar-accent text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
