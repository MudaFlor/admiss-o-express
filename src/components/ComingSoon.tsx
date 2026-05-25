import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  title,
  description,
  icon: Icon = Sparkles,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-[var(--shadow-elevated)]"
      >
        <Icon className="h-7 w-7" />
      </motion.div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Em breve no Mudaflor
      </div>
      <Button asChild variant="ghost" className="mt-6">
        <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
      </Button>
    </div>
  );
}