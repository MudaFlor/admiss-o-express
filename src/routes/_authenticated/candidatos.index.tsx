import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CandidateStatusBadge } from "@/components/CandidateStatusBadge";
import { createCandidate, listCandidates } from "@/lib/candidates.functions";
import { buildCandidateInviteMessage, buildWhatsAppLink } from "@/lib/integrations/whatsapp";

export const Route = createFileRoute("/_authenticated/candidatos/")({
  head: () => ({ meta: [{ title: "Candidatos — Admissão Digital" }] }),
  component: CandidatosPage,
});

function CandidatosPage() {
  const list = useServerFn(listCandidates);
  const create = useServerFn(createCandidate);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ link: string; name: string; phone: string } | null>(null);

  const q = useQuery({
    queryKey: ["candidates", search],
    queryFn: () => list({ data: { search } }),
  });

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await create({
        data: {
          full_name: String(fd.get("full_name")),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          position: String(fd.get("position") ?? ""),
          cpf: "",
        },
      });
      const link = `${window.location.origin}/c/${res.access_token}`;
      setCreated({ link, name: String(fd.get("full_name")), phone: String(fd.get("phone") ?? "") });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidato criado. Compartilhe o link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Candidatos</h1>
          <p className="text-sm text-muted-foreground">Gerencie convites, documentos e aprovações.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCreated(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo candidato</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{created ? "Link gerado" : "Novo candidato"}</DialogTitle>
              <DialogDescription>
                {created
                  ? "Compartilhe o link abaixo com o candidato pelo WhatsApp."
                  : "Informe os dados básicos. Um link único será gerado para o candidato enviar os documentos."}
              </DialogDescription>
            </DialogHeader>
            {!created ? (
              <form onSubmit={onCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone (com DDD)</Label>
                    <Input id="phone" name="phone" placeholder="11999998888" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="position">Cargo</Label>
                  <Input id="position" name="position" />
                </div>
                <DialogFooter>
                  <Button type="submit">Gerar link</Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{created.link}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => copyLink(created.link)}>
                    <Copy className="h-4 w-4" /> Copiar link
                  </Button>
                  <Button asChild>
                    <a
                      href={buildWhatsAppLink(
                        created.phone,
                        buildCandidateInviteMessage({ candidateName: created.name, link: created.link }),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : (q.data?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhum candidato ainda. Clique em "Novo candidato".</TableCell></TableRow>
              ) : (
                q.data!.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to="/candidatos/$id" params={{ id: c.id }} className="font-medium hover:underline">
                        {c.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell>{c.position ?? "—"}</TableCell>
                    <TableCell><CandidateStatusBadge status={c.status as never} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(`${window.location.origin}/c/${c.access_token}`)}
                      >
                        <Copy className="h-3.5 w-3.5" /> Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}