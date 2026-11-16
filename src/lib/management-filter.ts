export type PeriodMode = "anual" | "mensal";
export type ManagementFilter = { period: PeriodMode; year: number; month: number; department: string };

export type Bucket = { key: string; label: string; year: number; month: number };

function monthKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Meses exibidos nos gráficos.
 * - anual: janeiro a dezembro do ano escolhido.
 * - mensal: `count` meses terminando no mês escolhido (o último é o mês filtrado).
 */
export function buildBuckets(opts: { period?: PeriodMode; year?: number; month?: number; count: number; now?: Date }): Bucket[] {
  const now = opts.now ?? new Date();
  let endY = opts.year ?? now.getFullYear();
  let endM = opts.month ?? now.getMonth() + 1;
  let count = opts.count;
  if (opts.period === "anual") {
    endM = 12;
    count = 12;
  } else if (!opts.period) {
    endY = now.getFullYear();
    endM = now.getMonth() + 1;
  }
  const out: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endY, endM - 1 - i, 1);
    out.push({
      key: monthKey(d.getFullYear(), d.getMonth() + 1),
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") +
        (opts.period === "mensal" && count > 1 && d.getFullYear() !== endY ? `/${String(d.getFullYear()).slice(2)}` : ""),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return out;
}

export function bucketRange(b: Bucket[]) {
  const last = b[b.length - 1];
  const lastDay = new Date(last.year, last.month, 0).getDate();
  return { fromISO: `${b[0].key}-01`, toISO: `${last.key}-${String(lastDay).padStart(2, "0")}` };
}

export function sameDepartment(value: string | null | undefined, filter?: string) {
  if (!filter) return true;
  return (value ?? "").trim().toLocaleLowerCase("pt-BR") === filter.trim().toLocaleLowerCase("pt-BR");
}
