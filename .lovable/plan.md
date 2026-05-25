
# Rebrand para identidade preta premium (Mudaflor)

Transformar o FlowRH atual num dashboard de RH com identidade visual predominantemente preta, inspirada no logotipo Mudaflor (preto + verde-limão + rosa-magenta discretos como acentos), mantendo a estrutura já construída (sidebar + topbar + rotas autenticadas).

## 1. Identidade visual (tokens em `src/styles.css`)

Paleta nova em `oklch`, dark-first:
- `--background` quase-preto grafite (#0B0B0C)
- `--card` / `--popover` preto levemente elevado (#141416)
- `--foreground` branco off (#F5F5F4)
- `--muted` / `--muted-foreground` cinzas sofisticados
- `--border` cinza 12% sobre preto, bordas sutis
- `--sidebar` preto puro (#000) com `--sidebar-foreground` off-white
- `--primary` verde-limão do logo (#A8D90A aprox.) — usado com parcimônia em CTAs e estados ativos
- `--accent` rosa-magenta do logo (#E91E63 aprox.) — apenas microacentos (badges, indicadores)
- `--gold` dourado discreto (#C9A84C) para selos premium opcionais
- Tipografia: manter Inter + Plus Jakarta Sans, mas reduzir pesos para sensação corporativa (headings 600, body 400/500)
- Sombras: trocar para sombras pretas profundas e sutis (`0 1px 0 rgba(255,255,255,0.04)` para "lift" sobre preto)

Forçar tema escuro global (remover toggle / `dark:` condicional). Logo Mudaflor entra no topo da sidebar e na tela de login (copiar `user-uploads://LOGO_MUDA_FLOR.jpg` para `src/assets/logo-mudaflor.jpg`).

## 2. Shell (sidebar + topbar)

- `AppSidebar.tsx`: fundo `#000`, logo Mudaflor no topo, itens com hover sutil (white/5), item ativo com barra vertical verde-limão à esquerda + leve glow. Tipografia menor, tracking discreto.
- `AppTopbar.tsx`: fundo `--background`, borda inferior 1px, search com `bg-card` e ícone cinza, sino com dot magenta, avatar circular com anel cinza.
- `_authenticated.tsx`: garantir `dark` no `<html>` ou aplicar classes pretas direto via tokens.

## 3. Dashboard real (substitui `dashboard.tsx` atual)

Hoje o dashboard mostra só "Pendentes/Em análise/Aprovados/Rejeitados" + fila de candidatos. Substituir por experiência completa de RH:

- **5 KPI cards** no topo (grid 2/3/5 responsivo):
  - Colaboradores ativos
  - Vagas abertas
  - Admissões do mês
  - Documentos pendentes
  - Conformidade (%)
  Cada card: ícone monocromático cinza, número grande em branco, delta vs. mês anterior em verde-limão ou magenta.

- **Pipeline de recrutamento** (linha cheia): visualização horizontal das 5 etapas (Triagem → Entrevista → Teste → Proposta → Contratado) com contagem por etapa, usando dados reais de `listCandidates` agrupados por status + mock para etapas inexistentes. Barras finas pretas com preenchimento verde-limão proporcional.

- **Coluna esquerda (2/3)**:
  - Gráfico de admissões/desligamentos (Recharts AreaChart, 6 meses, mock) — linhas finas brancas/verde, grid quase invisível.
  - Tabela "Últimos colaboradores / candidatos" (8 linhas) com avatar, nome, cargo, status badge (variantes preto+borda colorida) e ação.

- **Coluna direita (1/3)**:
  - **Agenda de entrevistas e eventos** (lista vertical com hora, título, participantes, ponto colorido por tipo).
  - **Tarefas pendentes do RH** (checklist com 4–6 itens, mock).

- Botões de ação principais ("Novo colaborador", "Abrir vaga") no header do dashboard, com ícone Lucide à esquerda, fundo verde-limão sobre preto para CTA primário e ghost para secundário.

Tudo com microanimações leves via `framer-motion` (fade+slide-up escalonado nos cards).

## 4. Login e landing

- `login.tsx`: trocar coluna esquerda pelo logo Mudaflor centralizado sobre preto puro, com tagline curta e gradiente sutil verde→magenta atrás do logo (opacity 10%). Coluna direita: form sobre `--background`, inputs `bg-card`, botão primário verde-limão.
- `index.tsx` (landing): manter, mas reaplicar paleta preta — sem reescrever conteúdo, só tokens. (Se preferir, posso ocultar a landing e redirecionar `/` para `/dashboard` quando autenticado — confirmar se quiser).

## 5. Responsividade

- Sidebar já é colapsável via shadcn — verificar `collapsible="icon"` ativo, garantir mini-modo com ícones.
- Dashboard: grid 1 coluna em <768px, 2 em md, 3/5 em xl.
- Tabela com scroll horizontal em mobile; agenda vira card empilhado.

## 6. Fora de escopo (não muda)

- Lógica de candidatos, OCR, LGPD, signed URLs, server functions, RLS, auth — intactos.
- Rotas `colaboradores/documentos/ferias/recrutamento` continuam como `ComingSoon` (só repaginadas no tema preto).
- Sem migrations novas, sem mexer em Supabase.

## Detalhes técnicos

Arquivos a editar:
- `src/styles.css` — paleta dark + tokens novos (`--primary` lime, `--accent` magenta, `--gold`)
- `src/components/AppSidebar.tsx` — fundo preto, logo Mudaflor, item ativo lime
- `src/components/AppTopbar.tsx` — ajustes de cor
- `src/routes/_authenticated/dashboard.tsx` — reescrita completa (KPIs, pipeline, agenda, tabela, tarefas)
- `src/routes/login.tsx` — coluna esquerda com logo
- `src/routes/index.tsx` — reaplicar paleta
- `src/components/ComingSoon.tsx` — leve ajuste para tema escuro

Arquivos a criar:
- `src/assets/logo-mudaflor.jpg` (copy do upload)
- `src/components/dashboard/KpiCard.tsx`
- `src/components/dashboard/RecruitmentPipeline.tsx`
- `src/components/dashboard/HiringChart.tsx` (Recharts)
- `src/components/dashboard/AgendaList.tsx`
- `src/components/dashboard/TasksList.tsx`
- `src/components/dashboard/RecentPeopleTable.tsx`

Dependências: `framer-motion` e `recharts` já instaladas (verificar — se faltar recharts, adicionar).

## Pergunta rápida antes de implementar

A `/` (landing pública) deve continuar existindo ou prefere que usuários autenticados sejam redirecionados direto para `/dashboard`?
