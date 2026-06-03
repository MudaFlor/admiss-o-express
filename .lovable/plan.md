## Dashboards Gerenciais — Acesso da Gestão

Criar uma nova área **"Gestão"** acessível pelo sidebar (somente para usuários com role `admin`/`rh`), com 3 dashboards interligados focados em KPIs reais de RH.

### 1. Estrutura de navegação

- Nova entrada no `AppSidebar.tsx`: **"Gestão"** com ícone `BarChart3`.
- Rota layout `src/routes/_authenticated/gestao.tsx` com `<Outlet />` e abas (Tabs) para os 4 painéis.
- Rotas filhas:
  - `gestao.index.tsx` → visão consolidada (todos os KPIs resumidos)
  - `gestao.absenteismo.tsx`
  - `gestao.rotatividade.tsx`
  - `gestao.pipeline.tsx` (currículos, integração, admissões, rescisões)

Filtro global de período (últimos 30/90/180 dias, ano) no topo via `validateSearch` + `Route.useSearch()`.

### 2. Modelo de dados (migration)

Hoje só existe a tabela `candidates`. Para suportar os indicadores reais, criar:

- **`employees`** — colaboradores admitidos
  - `id`, `created_by` (rh dono), `candidate_id` (opcional, FK lógica), `full_name`, `position`, `department`, `admission_date`, `termination_date` (null = ativo), `termination_reason` (enum: `pedido_demissao`, `sem_justa_causa`, `justa_causa`, `fim_experiencia`, `acordo`), `in_probation` (bool gerado: admission < 90 dias)
- **`absences`** — registros de ausência
  - `id`, `employee_id`, `start_date`, `end_date`, `reason` (enum: `atestado`, `falta_justificada`, `falta_injustificada`, `licenca`), `hours_lost`, `created_by`
- Enums: `termination_reason`, `absence_reason`
- Trigger `set_updated_at` nas duas tabelas
- RLS: dono (`created_by = auth.uid()`) OU `has_role(auth.uid(),'admin')`, mesmo padrão das tabelas atuais
- GRANTs para `authenticated` + `service_role`

Pipeline (currículos / em integração) é derivado de `candidates.status`; rescisões em experiência vêm de `employees` com `termination_date - admission_date <= 90`.

### 3. Server functions (`src/lib/management.functions.ts`)

Todas com `requireSupabaseAuth`, retornando DTOs serializáveis:

- `getAbsenteeismStats({ from, to })` → série mensal `{ month, rate, hours_lost, employees_count }` + breakdown por motivo + top 5 departamentos.
- `getTurnoverStats({ from, to })` → série mensal `{ month, hires, terminations, turnover_rate }` + breakdown por motivo + tempo médio de casa.
- `getPipelineStats({ from, to })` → contadores por status de candidato, admissões no período, rescisões em experiência, gráfico de funil.
- `listEmployees`, `createEmployee`, `terminateEmployee`, `createAbsence` para alimentar dados.

Cálculos:
- **Absenteísmo mensal** = `horas_perdidas / (colaboradores_ativos * 220h)` × 100
- **Rotatividade mensal** = `(admissões + rescisões) / 2 / colaboradores_ativos_inicio_mês` × 100
- **Rescisão em experiência** = terminations onde `(termination_date - admission_date) <= 90 dias`

### 4. UI dos dashboards

Mantendo a identidade dark (`#0B0B0C` + lime `#A8D90A` + magenta `#E91E63`):

**`gestao.index.tsx`** — visão executiva
- 4 KPI cards: Taxa de absenteísmo, Taxa de rotatividade, Admissões no período, Rescisões em experiência
- Mini-gráficos sparkline por card (Recharts `AreaChart` compacto)
- Atalhos para os 3 painéis detalhados

**`gestao.absenteismo.tsx`**
- KPI grande: taxa atual + variação vs período anterior
- `LineChart` mensal (12 meses)
- `BarChart` horizontal: motivos (atestado, injustificada, licença…)
- Tabela: top 10 colaboradores com mais ausências no período

**`gestao.rotatividade.tsx`**
- KPI: taxa de rotatividade + tempo médio de casa
- `ComposedChart`: barras de admissões/rescisões + linha de turnover %
- `PieChart`: motivos de desligamento
- Tabela: rescisões recentes com dias na empresa

**`gestao.pipeline.tsx`**
- Funil: Currículos recebidos → Em análise → Em integração (aprovados ainda sem `employees.admission_date`) → Admitidos → Rescindidos em experiência
- KPI cards: Currículos no período, Em integração agora, Admissões, Rescisões em experiência
- Tabela: candidatos aprovados aguardando admissão (CTA "Converter em colaborador")

### 5. Componentes reutilizáveis (`src/components/management/`)

- `KpiCard.tsx` (com delta + sparkline opcional)
- `PeriodFilter.tsx` (Dropdown 30/90/180/ano + custom)
- `ChartCard.tsx` (wrapper com título, legenda, loading skeleton)
- `EmptyState.tsx` para quando ainda não há dados

Tudo via `useSuspenseQuery` + `ensureQueryData` no loader (padrão TanStack Query do template).

### 6. Controle de acesso

- `_authenticated/gestao.tsx` faz `beforeLoad` chamando uma server function `requireManagementRole()` que verifica `has_role(uid,'admin')` OR `has_role(uid,'rh')`. Se falhar → `redirect({ to: '/dashboard' })`.

### 7. Detalhes técnicos

- Migration SQL com `CREATE TYPE`, `CREATE TABLE`, GRANTs, RLS, triggers — em **um único arquivo** novo em `supabase/migrations/`.
- Atualizar `AppSidebar.tsx` adicionando item "Gestão" condicionado ao role (consultado por server fn `getCurrentUserRoles`).
- Sem dependências novas; Recharts já está disponível.
- Toda a UI segue tokens existentes de `src/styles.css` (sem cores hardcoded).
- Mobile: cards empilhados, tabelas com `overflow-x-auto`, abas convertidas em `Select` em telas <640px.

### Fora de escopo

- Importação em massa de colaboradores via CSV (pode vir depois).
- Integração com ponto eletrônico real.
- Exportação PDF dos dashboards.