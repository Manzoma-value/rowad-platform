type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

export default function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-black/10 bg-[#FFFDF8] p-5 shadow-[0_10px_34px_rgba(8,11,12,0.065)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A96A]/55 to-transparent" />
      <div className="mb-5 flex items-center gap-3">
        <span className="h-9 w-1 rounded-full bg-gradient-to-b from-[#E0C788] to-[#A8863E]" />
        <h2 className="text-lg font-black tracking-tight text-[#080B0C]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
