import { toast } from "sonner";
import { Copy, FileDown, MessageSquare, Users, Swords, HeartPulse, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ETHICS_NOTICE, analysisV2ToText, type ProfileAnalysisV2 } from "@/lib/profile/questions";

const good = "border-primary/40 bg-primary/10 text-primary";
const neutral = "border-border bg-muted text-muted-foreground";

function Block({ icon: Icon, title, badge, children }: { icon: typeof Users; title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-muted-foreground" />{title}</p>
        {badge}
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function escapeHtml(t: string) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function exportProfilePdf(name: string, a: ProfileAnalysisV2) {
  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para exportar o PDF"); return; }
  const body = escapeHtml(analysisV2ToText(name, a)).split("\n").map((l, i) => i === 0 ? `<h1>${l}</h1>` : /^\d\./.test(l) ? `<h2>${l}</h2>` : l ? `<p>${l}</p>` : "").join("");
  w.document.write(`<!doctype html><html><head><title>Perfil — ${escapeHtml(name)}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;color:#111;line-height:1.5}h1{font-size:20px}h2{font-size:15px;margin-top:20px}p{font-size:13px;margin:4px 0}small{color:#666}</style></head><body>${body}<p><small>${escapeHtml(ETHICS_NOTICE)}</small></p></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function ProfileResultDashboard({ name, a }: { name: string; a: ProfileAnalysisV2 }) {
  const pontes = a.veredito.perfil === "Pontes";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(analysisV2ToText(name, a)); toast.success("Resultado copiado"); }}>
          <Copy className="mr-1 h-3 w-3" /> Copiar Resultado
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportProfilePdf(name, a)}>
          <FileDown className="mr-1 h-3 w-3" /> Exportar em PDF
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Block icon={MessageSquare} title="Estilo de Comunicação Corporativa" badge={<Badge variant="outline" className={a.comunicacao.estilo === "Assertivo" ? good : neutral}>{a.comunicacao.estilo}</Badge>}>
          <p className="whitespace-pre-line">{a.comunicacao.explicacao}</p>
        </Block>
        <Block icon={Users} title="Dinâmica de Colaboração e Interdependência">
          <p className="whitespace-pre-line">{a.colaboracao.explicacao}</p>
        </Block>
        <Block icon={Swords} title="Resolução de Conflitos" badge={<Badge variant="outline" className={a.conflitos.estrategia.startsWith("Colaboração") ? good : neutral}>{a.conflitos.estrategia}</Badge>}>
          <Badge variant="outline" className={a.conflitos.separa_tecnico_pessoal ? good : neutral}>
            {a.conflitos.separa_tecnico_pessoal ? "Separa o técnico do pessoal" : "Mistura o técnico com o pessoal"}
          </Badge>
          <p className="whitespace-pre-line">{a.conflitos.explicacao}</p>
        </Block>
        <Block icon={HeartPulse} title="Inteligência Emocional sob Pressão">
          <p className="whitespace-pre-line">{a.inteligencia_emocional.explicacao}</p>
        </Block>
      </div>
      <Block icon={Flag} title="Veredito Final" badge={<Badge variant="outline" className={pontes ? good : neutral}>Perfil {a.veredito.perfil}</Badge>}>
        <p className="whitespace-pre-line">{a.veredito.justificativa}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-semibold text-foreground">Ponto forte</p><p>{a.veredito.ponto_forte}</p></div>
          <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-semibold text-foreground">Ponto de desenvolvimento</p><p>{a.veredito.ponto_desenvolvimento}</p></div>
        </div>
      </Block>
      <p className="text-xs text-muted-foreground">{ETHICS_NOTICE}</p>
    </div>
  );
}
