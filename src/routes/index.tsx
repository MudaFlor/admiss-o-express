import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Users, FileText, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-elevated)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">FlowRH</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm" className="bg-[image:var(--gradient-brand)] shadow-[var(--shadow-elevated)]"><Link to="/login">Começar grátis</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Nova geração de RH
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            O RH da sua empresa, finalmente premium.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            FlowRH centraliza colaboradores, documentos, férias e recrutamento em uma única
            plataforma moderna — feita para equipes que querem produtividade sem burocracia.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[image:var(--gradient-brand)] shadow-[var(--shadow-elevated)]"><Link to="/login">Começar agora <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Já tenho conta</Link></Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: "Colaboradores", desc: "CRUD completo, perfis ricos com timeline, documentos e histórico profissional." },
            { icon: FileText, title: "Documentos & Admissão", desc: "Upload drag-and-drop, OCR automático e LGPD compliant de ponta a ponta." },
            { icon: Briefcase, title: "Recrutamento Kanban", desc: "Vagas em estilo Monday.com com candidatos arrastáveis entre etapas." },
          ].map((f) => (
            <Card key={f.title} className="border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
              <CardContent className="space-y-2 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FlowRH · A nova plataforma premium de RH para empresas modernas.
        </div>
      </footer>
    </div>
  );
}
