import Link from "next/link";

type SidebarItem = {
  label: string;
  href: string;
};

type SidebarProps = {
  title: string;
  items: SidebarItem[];
};

export default function Sidebar({ title, items }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-l border-[#B8A082]/15 bg-gradient-to-b from-[#5B1526] via-[#4A0E1C] to-[#32101A] p-4 text-[#F7F3EB] shadow-[0_20px_60px_rgba(26,26,26,0.24)] md:block">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,160,130,0.13),transparent_55%)]" />
      <div className="relative mb-5 flex items-center gap-3 rounded-2xl border border-[#B8A082]/20 bg-white/[0.04] p-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#B8A082]/30 bg-[#B8A082]/12">
          <span className="h-3 w-3 rounded-full bg-[#B8A082] shadow-[0_0_18px_rgba(184,160,130,0.65)]" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-[#FFFBF5]">{title}</h2>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#B8A082]/55">
            Workspace
          </p>
        </div>
      </div>

      <div className="relative mb-4 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#B8A082]/25 to-transparent" />
        <span className="h-1.5 w-1.5 rotate-45 bg-[#B8A082]/70" />
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#B8A082]/25 to-transparent" />
      </div>

      <nav className="relative space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-[#E5E0D5]/75 no-underline hover:border-[#B8A082]/20 hover:bg-white/[0.06] hover:text-[#F7F3EB]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#B8A082]/10 bg-white/[0.05] text-[#B8A082] group-hover:border-[#B8A082]/28 group-hover:bg-[#B8A082]/12">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            <span className="truncate">
            {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
