import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, FileText, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo-mudaflor.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowRH — Plataforma premium de RH e Departamento Pessoal" },
      {
        name: "description",
        content:
          "Colaboradores, documentos, férias e recrutamento em uma única plataforma moderna. RH sem fricção.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/95">
              <img src={logo} alt="Mudaflor" className="h-6 w-6 object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Mudaflor</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/login">Acessar painel</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> People OS · Mudaflor
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Gestão de pessoas, com a precisão da Mudaflor.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Colaboradores, documentos, férias e recrutamento centralizados em uma plataforma
            sóbria, segura e premium — feita para operar RH com seriedade.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/login">Acessar painel <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-card"><Link to="/login">Sou colaborador</Link></Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: "Colaboradores", desc: "CRUD completo, perfis ricos com timeline, documentos e histórico profissional." },
            { icon: FileText, title: "Documentos & Admissão", desc: "Upload drag-and-drop, OCR automático e LGPD compliant de ponta a ponta." },
            { icon: Briefcase, title: "Recrutamento", desc: "Pipeline de vagas em kanban com candidatos arrastáveis entre etapas." },
          ].map((f) => (
            <Card key={f.title} className="border-border bg-card transition-all hover:-translate-y-0.5 hover:border-white/15">
              <CardContent className="space-y-2 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mudaflor · Plataforma premium de gestão de pessoas.
        </div>
      </footer>
    </div>
  );
}
