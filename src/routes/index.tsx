import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MessageCircle, FileCheck2, ScanLine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Admissão Digital — RH integrado ao WhatsApp" },
      {
        name: "description",
        content:
          "Envie um link pelo WhatsApp e receba documentos com OCR automático. Aprove admissões em minutos.",
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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-semibold">Admissão Digital</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm"><Link to="/login">Começar grátis</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <MessageCircle className="h-3 w-3" /> Integrado ao WhatsApp
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            Admissão sem papel, sem fricção, em minutos.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            O RH envia um link pelo WhatsApp. O candidato envia os documentos pelo celular. O OCR
            preenche a ficha automaticamente — você só revisa e aprova.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg"><Link to="/login">Começar agora <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Já tenho conta</Link></Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: MessageCircle, title: "Envie pelo WhatsApp", desc: "Gere o link único do candidato e compartilhe direto pelo wa.me." },
            { icon: ScanLine, title: "OCR automático", desc: "RG, CPF, CNH e comprovante são lidos e a ficha é pré-preenchida." },
            { icon: FileCheck2, title: "Aprove em um clique", desc: "Revise documentos e dados lado a lado e aprove ou rejeite com motivo." },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent className="space-y-2 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
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
          © {new Date().getFullYear()} Admissão Digital · Preparado para integrações com Receita Federal/Serpro e WhatsApp Cloud API.
        </div>
      </footer>
    </div>
  );
}
