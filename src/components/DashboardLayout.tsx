import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import DashboardBreadcrumb from "./DashboardBreadcrumb";
import KeyboardShortcuts from "./KeyboardShortcuts";
import PageTransition from "./PageTransition";
import RealtimeDebugPanel from "./RealtimeDebugPanel";
import AuthDebugPanel from "./AuthDebugPanel";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <KeyboardShortcuts />
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 min-w-0">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <DashboardBreadcrumb />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
      {import.meta.env.DEV && <RealtimeDebugPanel />}
    </div>
  );
}

