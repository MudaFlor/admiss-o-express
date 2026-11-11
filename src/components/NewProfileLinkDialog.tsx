import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MessageCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createDiscAssessment, searchProfilePeople } from "@/lib/disc.functions";
import { buildWhatsAppLink } from "@/lib/integrations/whatsapp";
import { discUrl } from "@/components/DiscCard";

type Person = Awaited<ReturnType<typeof searchProfilePeople>>[number];

export function NewProfileLinkDialog() {
  const search = useServerFn(searchProfilePeople);
  const create = useServerFn(createDiscAssessment);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [sel, setSel] = useState<Person | null>(null);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => { search({ data: { q } }).then(setResults).catch((e) => toast.error((e as Error).message)); }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  function reset() { setQ(""); setResults([]); setSel(null); setPhone(""); setReason(""); }

  async function generate(viaWhats: boolean) {
    if (!sel) return;
    setBusy(true);
    try {
      const target = sel.tipo === "colaborador" ? { employee_id: sel.id } : { candidate_id: sel.id };
      const row = await create({ data: { ...target, respondent_name: sel.full_name, phone, cycle_reason: reason } });
      const url = discUrl(row.token);
      if (viaWhats) {
        window.open(buildWhatsAppLink(phone, `Olá ${sel.full_name}! 👋\n\nGostaríamos de conhecer melhor seu perfil. São só duas perguntas para responder com suas palavras:\n\n${url}`), "_blank");
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
      await qc.invalidateQueries({ queryKey: ["profile-analyses"] });
      setOpen(false);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Gerar link de pesquisa</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova pesquisa de perfil</DialogTitle></DialogHeader>
        {!sel ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar candidato ou colaborador pelo nome" className="pl-8" />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {q.trim().length >= 2 && results.length === 0 && <p className="p-2 text-sm text-muted-foreground">Ninguém encontrado.</p>}
              {results.map((p) => (
                <button key={`${p.tipo}-${p.id}`} type="button" onClick={() => { setSel(p); setPhone(p.phone ?? ""); }} className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted">
                  <span><span className="font-medium">{p.full_name}</span>{p.position && <span className="text-muted-foreground"> · {p.position}</span>}</span>
                  <span className="text-xs text-muted-foreground">{p.tipo === "colaborador" ? "Colaborador" : "Candidato"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span><span className="font-medium">{sel.full_name}</span> <span className="text-muted-foreground">· {sel.tipo === "colaborador" ? "Colaborador" : "Candidato"}</span></span>
              <Button size="sm" variant="ghost" onClick={() => setSel(null)}>Trocar</Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-phone">WhatsApp</Label>
              <Input id="np-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-reason">Motivo da avaliação (opcional)</Label>
              <Input id="np-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: fim da experiência, promoção" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => generate(false)}><Copy className="mr-1 h-4 w-4" /> Gerar e copiar link</Button>
              <Button disabled={busy || !phone.trim()} onClick={() => generate(true)}><MessageCircle className="mr-1 h-4 w-4" /> Enviar por WhatsApp</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
