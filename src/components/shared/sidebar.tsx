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
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-l border-[#C8A96A]/15 bg-gradient-to-b from-[#1E2329] via-[#181C21] to-[#11151A] p-4 text-[#F5E5BC] shadow-[0_20px_60px_rgba(8,11,12,0.24)] md:block">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(200,169,106,0.13),transparent_55%)]" />
      <div className="relative mb-5 flex items-center gap-3 rounded-2xl border border-[#C8A96A]/20 bg-white/[0.04] p-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#C8A96A]/30 bg-[#C8A96A]/12">
          <span className="h-3 w-3 rounded-full bg-[#C8A96A] shadow-[0_0_18px_rgba(200,169,106,0.65)]" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-[#FFFDF8]">{title}</h2>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8A96A]/55">
            Workspace
          </p>
        </div>
      </div>

      <div className="relative mb-4 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C8A96A]/25 to-transparent" />
        <span className="h-1.5 w-1.5 rotate-45 bg-[#C8A96A]/70" />
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C8A96A]/25 to-transparent" />
      </div>

      <nav className="relative space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-[#E8DCBC]/75 no-underline hover:border-[#C8A96A]/20 hover:bg-white/[0.06] hover:text-[#FFF8E6]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#C8A96A]/10 bg-white/[0.05] text-[#C8A96A] group-hover:border-[#C8A96A]/28 group-hover:bg-[#C8A96A]/12">
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
