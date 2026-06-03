import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaInverse?: boolean;
  icon?: LucideIcon;
  hint?: string;
}

export function KpiCard({ label, value, unit, delta, deltaInverse, icon: Icon, hint }: Props) {
  const isGood = delta == null ? null : deltaInverse ? delta < 0 : delta > 0;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50 bg-card/60 p-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {delta != null && Number.isFinite(delta) && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                isGood
                  ? "bg-primary/10 text-primary"
                  : isGood === false
                    ? "bg-accent/10 text-accent"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(2)}{unit === "%" ? "pp" : ""}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </Card>
    </motion.div>
  );
}