import Sidebar from "./sidebar";
import Header from "./header";

type SidebarItem = {
  label: string;
  href: string;
};

type DashboardShellProps = {
  title: string;
  sidebarTitle: string;
  sidebarItems: SidebarItem[];
  children: React.ReactNode;
};

export default function DashboardShell({
  title,
  sidebarTitle,
  sidebarItems,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_12%_8%,rgba(184,160,130,0.08),transparent_32%),radial-gradient(ellipse_at_88%_86%,rgba(107,30,45,0.04),transparent_34%),#EFEAE0] text-[#1A1A1A]">
      <div className="flex min-h-screen">
        <Sidebar title={sidebarTitle} items={sidebarItems} />

        <div className="flex flex-1 flex-col">
          <Header title={title} />

          <main className="relative flex-1 overflow-hidden p-4 sm:p-6 lg:p-10">
            <div
              className="pointer-events-none absolute left-8 top-8 h-72 w-72 rounded-full border border-[#B8A082]/10 opacity-40"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-7xl animate-[dashIn_.42s_cubic-bezier(.22,1,.36,1)_both] rounded-[18px] border border-black/10 bg-[#FFFBF5]/92 p-4 shadow-[0_18px_50px_rgba(26,26,26,0.08)] backdrop-blur sm:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#B8A082]/60 to-transparent" />
              {children}
            </div>
          </main>
        </div>
      </div>
      <style>{`
        @keyframes dashIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
