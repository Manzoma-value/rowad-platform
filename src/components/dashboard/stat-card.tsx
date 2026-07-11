type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[16px] border border-black/10 bg-[#FFFBF5] p-5 shadow-[0_8px_28px_rgba(26,26,26,0.06)] transition hover:-translate-y-0.5 hover:border-[#B8A082]/45 hover:shadow-[0_16px_42px_rgba(26,26,26,0.10)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#B8A082]/55 to-transparent opacity-0 transition group-hover:opacity-100" />
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8C8274]">{title}</p>
      <h3 className="mt-3 text-3xl font-black tracking-tight text-[#1A1A1A]">{value}</h3>
      {subtitle && (
        <p className="mt-2 text-sm font-semibold text-[#655B53]">{subtitle}</p>
      )}
    </div>
  );
}
