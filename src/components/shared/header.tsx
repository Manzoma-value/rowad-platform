import LogoutButton from "./logout-button";

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-4 border-b border-black/10 bg-[#FBFAF6]/85 px-4 py-3 shadow-[0_8px_28px_rgba(26,26,26,0.04)] backdrop-blur-xl sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-[#FFFBF5] text-[#8F765B] sm:grid">
          <span className="h-2 w-2 rounded-full bg-current" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8F765B]">
            Dashboard
          </p>
          <h1 className="truncate text-xl font-black tracking-tight text-[#1A1A1A] sm:text-2xl">
            {title}
          </h1>
        </div>
      </div>
      <LogoutButton />
    </header>
  );
}
