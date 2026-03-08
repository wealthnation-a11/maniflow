import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useBusiness } from "@/hooks/use-business";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Menu,
  X,
  Zap,
  LogOut,
  Settings,
  Bell,
  Bot,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inbox", icon: MessageSquare, path: "/inbox", badge: 12 },
  { label: "Bot Config", icon: Bot, path: "/bot-config" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Orders", icon: ShoppingCart, path: "/orders", badge: 3 },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

export default function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl, businessName } = useBusiness();

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-heading font-bold text-sidebar-foreground text-lg">AutoServe</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/inbox" className="relative p-1 text-sidebar-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full gradient-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">3</span>
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
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-sidebar-foreground text-xl tracking-tight">AutoServe</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
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
                {item.badge && (
                  <span className="gradient-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
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
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
