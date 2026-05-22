import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Users, UserCog, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import loginArt from "@/assets/flowrh-login.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — FlowRH" },
      { name: "description", content: "Acesse o FlowRH, sua plataforma de RH e Departamento Pessoal." },
    ],
  }),
  component: LoginPage,
});

const profiles = [
  { id: "rh", label: "RH", icon: UserCog, hint: "Gestão completa" },
  { id: "gestor", label: "Gestor", icon: Users, hint: "Aprovar equipe" },
  { id: "colab", label: "Colaborador", icon: User, hint: "Meus dados" },
] as const;

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<(typeof profiles)[number]["id"]>("rh");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: String(fd.get("full_name") ?? ""),
          company_name: String(fd.get("company_name") ?? ""),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu email para confirmar.");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) toast.error("Falha no login com Google");
    if (!result.redirected && !result.error) navigate({ to: "/dashboard" });
  }

  async function handleReset() {
    const email = prompt("Informe seu email:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado.");
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left: branding */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col">
        <img
          src={loginArt}
          alt=""
          aria-hidden="true"
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar/85 via-sidebar/60 to-sidebar/95" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-sidebar-foreground">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-brand)] shadow-[var(--shadow-elevated)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">FlowRH</span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                People Platform
              </span>
            </div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md space-y-6"
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              A plataforma de RH que sua empresa merece.
            </h1>
            <p className="text-lg text-sidebar-foreground/75">
              Colaboradores, documentos, férias e recrutamento — em um único lugar, com a experiência
              premium que sua equipe vai amar usar.
            </p>
            <div className="flex items-center gap-6 pt-4">
              {["+10k colaboradores", "LGPD ready", "99.9% uptime"].map((t) => (
                <div key={t} className="text-xs font-medium text-sidebar-foreground/60">
                  {t}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="text-xs text-sidebar-foreground/40">
            © {new Date().getFullYear()} FlowRH · Todos os direitos reservados
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">FlowRH</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para continuar gerenciando sua equipe.
            </p>
          </div>

          {/* Profile selector */}
          <div className="mt-7 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acessar como
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {profiles.map((p) => {
                const active = profile === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfile(p.id)}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-[var(--shadow-card)]"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
                    }`}
                  >
                    <p.icon
                      className={`h-4 w-4 transition-colors ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className={`text-xs font-semibold ${active ? "text-foreground" : "text-foreground/80"}`}>
                      {p.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email corporativo</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com" className="h-11 pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="h-11 pl-9" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox id="remember" />
                    <span className="text-xs">Lembrar acesso</span>
                  </label>
                  <button type="button" onClick={handleReset} className="text-xs font-medium text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <Button type="submit" disabled={loading} className="group h-11 w-full bg-[image:var(--gradient-brand)] text-base font-semibold shadow-[var(--shadow-elevated)] transition-all hover:opacity-95 hover:shadow-lg">
                  {loading ? "Entrando..." : "Entrar"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">ou continue com</span></div>
              </div>

              <Button type="button" variant="outline" onClick={handleGoogle} className="h-11 w-full font-medium">
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Entrar com Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-5">
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" className="text-xs font-medium">Seu nome</Label>
                    <Input id="full_name" name="full_name" required className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name" className="text-xs font-medium">Empresa</Label>
                    <Input id="company_name" name="company_name" className="h-11" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup_email" className="text-xs font-medium">Email corporativo</Label>
                  <Input id="signup_email" name="email" type="email" required autoComplete="email" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup_password" className="text-xs font-medium">Senha</Label>
                  <Input id="signup_password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-11" />
                  <p className="text-[11px] text-muted-foreground">Mínimo de 8 caracteres.</p>
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full bg-[image:var(--gradient-brand)] font-semibold shadow-[var(--shadow-elevated)] hover:opacity-95">
                  {loading ? "Criando..." : "Criar minha conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos Termos e Política de Privacidade.
          </p>
        </motion.div>
      </div>
    </div>
  );
}