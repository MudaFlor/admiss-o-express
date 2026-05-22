## Visão geral

O projeto hoje é um sistema de admissão digital (candidatos, OCR, LGPD, signed URLs). Vamos reposicioná-lo como **FlowRH** — SaaS de RH/DP premium — **preservando tudo que já funciona** (auth Supabase, candidatos com LGPD/OCR, edição de status, preview de documentos) e adicionando os módulos pedidos.

Como o escopo é gigante, proponho **5 fases incrementais**, cada uma utilizável de ponta a ponta. Você aprova fase a fase.

---

## Fase 1 — Identidade visual & shell premium

Sem mudanças de banco. Foco em parecer FlowRH.

- Rebrand para **FlowRH** (sidebar, `<title>`, login, footer).
- Atualizar `src/styles.css` com a paleta solicitada em tokens semânticos `oklch`:
  - `--background` `#F5F7FB`, `--sidebar` `#111827` (escura), `--primary` `#2563EB`, `--success` `#10B981`, `--warning` `#F59E0B`, `--destructive` `#EF4444`, foreground `#111827` / muted `#6B7280`.
  - Novos tokens: `--shadow-card`, `--shadow-elevated`, `--gradient-brand`.
- Tipografia **Inter** + **Plus Jakarta Sans** para headings (Google Fonts via `@import`).
- Sidebar escura premium (`AppSidebar.tsx`): hover suave, item ativo com pílula azul + borda lateral, ícones Lucide, novos itens — **Dashboard, Colaboradores, Documentos, Férias, Recrutamento, Configurações**.
- Topbar moderna nova (`components/AppTopbar.tsx`): busca global, sino de notificações, avatar + dropdown.
- Instalar **framer-motion** para fade/scale nos cards e transições de página.
- **Login redesenhado** em duas colunas: esquerda com branding FlowRH + imagem abstrata gerada + frase corporativa; direita com formulário (email, senha, lembrar, recuperar) + seletor visual de perfil (RH / Gestor / Colaborador) — o seletor é apenas visual nesta fase, sem mudar a lógica de auth.

## Fase 2 — Dashboard executivo

- 5 cards KPI (Colaboradores, Férias próximas, Admissões pendentes, Documentos pendentes, Vagas abertas) com ícone, valor grande, variação %, sparkline (**Recharts**) e hover animation.
- **Recharts** (instalar): Doughnut "Colaboradores por setor", Bar "Admissões por mês", barras de progresso "Status documental".
- Widgets: **Calendário RH** mensal (admissões/férias/aniversários/vencimentos) usando `react-day-picker` já instalado; **Tarefas pendentes** (aprovações/documentos/férias/assinaturas) com checkbox e prioridade.
- Dados reais quando existirem (candidatos/documentos atuais) + mock realista para o restante até os módulos serem implementados.

## Fase 3 — Colaboradores (CRUD)

- Nova tabela `employees` (nome, email, cpf, cargo, setor, gestor_id, data_admissao, status `ativo|afastado|desligado`, avatar_url, dados em jsonb).
- RLS por `created_by` (mesmo padrão de `candidates`).
- `/colaboradores`: tabela moderna (avatar, nome, cargo, setor, gestor, admissão, status, ações) com busca, filtros, paginação.
- Drawer lateral de detalhes + modal "novo colaborador".
- `/colaboradores/$id` com abas: **Visão geral, Histórico, Documentos, Férias, Ocorrências** + timeline profissional.

## Fase 4 — Documentos, Férias e Recrutamento Kanban

- **Documentos** `/documentos`: central com upload drag-and-drop (`employee-documents` bucket), categorias (admissionais/contratos/férias/advertências/exames), status (enviado/pendente/aprovado) com badges coloridas, filtros, preview e download via signed URL.
- **Férias**: tabelas `vacation_balances` + `vacation_requests`. Rota `/ferias` com solicitar/aprovar, calendário mensal, saldo, histórico, alertas de conflito e vencimento.
- **Recrutamento Kanban** `/recrutamento`: tabela `job_openings`. Kanban (Aberta → Triagem → Entrevista → Proposta → Encerrada) com drag-and-drop via `@dnd-kit/core`, cards (título/setor/candidatos/responsável/prioridade), criar/editar vaga em modal. A página `/candidatos` atual continua existindo e vira sub-aba "Triagem".

## Fase 5 — Configurações & polish

- `/configuracoes` com abas: **Usuários, Permissões, Cargos, Setores, Integrações, Preferências** (evolução da página atual). Novas tabelas `departments` e `positions`; permissões via `user_roles` existente.
- Skeletons de loading, estados vazios ilustrados, microinterações framer-motion finais.
- Revisão completa de responsividade (sidebar recolhível mobile, tabelas com scroll, cards empilhados).

---

## Detalhes técnicos

- Stack mantida: TanStack Start + React 19 + Tailwind v4 + shadcn + Supabase (Lovable Cloud).
- Tokens em `src/styles.css` (oklch). Nenhuma cor hardcoded em componente.
- Server functions (`createServerFn` + `requireSupabaseAuth`) para todo acesso a dados novos, RLS por `created_by`.
- Novas libs: `framer-motion`, `recharts` (Fase 1/2), `@dnd-kit/core` (Fase 4).
- **Não tocar** em `src/integrations/supabase/*` nem em `supabase/migrations/*` existentes.

## Fora de escopo

- Folha de pagamento, ponto, eSocial.
- Assinatura eletrônica real (apenas status visual).
- Notificações por email/push automáticas.
- Importação CSV em massa.

---

## Próximo passo

Confirmo começar pela **Fase 1 (identidade visual + shell + login premium)**? Se preferir outra ordem (ex.: começar pelo Recrutamento Kanban porque é o mais visualmente impactante), me diga.