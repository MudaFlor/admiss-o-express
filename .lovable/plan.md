## Objetivo
Remover todos os dados fictícios/placeholders dos dashboards para que o sistema exiba apenas dados reais cadastrados pelo usuário.

## O que será alterado

### 1. `src/routes/_authenticated/dashboard.tsx` (principal foco)
Hoje contém vários arrays e números chumbados. Vou trocar por dados reais ou estados vazios:

- **KPIs chumbados** (`248 colaboradores ativos`, `14 vagas`, `22 admissões/mês`, `98.4% conformidade`, deltas `+12 / +3 / +18% / +0.6`) → puxar de `getManagementOverview` (já existe) e `getDashboardStats`. Quando não houver dados, exibir `0` e remover os "deltas" fictícios.
- **`chartData`** (Jun–Nov com números inventados) → usar `series` real de `getManagementOverview` (admissões/desligamentos dos últimos 6 meses). Sem dados → mensagem "Sem movimentações no período".
- **`stages`** (Triagem 24, Entrevista 12, Teste técnico 6, Proposta 3, Contratado 2) → usar `pipeline` real de `getManagementOverview` (currículos, em análise, aprovados, pendentes, rejeitados).
- **`agenda`** (Ana Lima, Lucas R., etc.) → remover o card de "Agenda de hoje" (não há fonte de dados; reintroduzimos quando houver feature de agenda).
- **`tasks`** (Validar contratos, Enviar holerites, etc.) → remover o card de "Tarefas do RH" pelo mesmo motivo.
- **Subtítulo** (`"4 entrevistas hoje · 7 documentos aguardando revisão"`) → trocar pelo total real de candidatos no pipeline ou texto neutro quando vazio.

### 2. `src/lib/management.functions.ts`
- Remover o fallback `|| 1` no cálculo de `activeStart` (linha 66). Hoje ele finge que existe 1 colaborador quando não há nenhum, o que inflaciona artificialmente as taxas de absenteísmo/rotatividade. Sem colaboradores, as taxas ficam `0`.

### 3. Páginas `gestao.*` (absenteismo, rotatividade, pipeline, index)
Já estão 100% baseadas em `getManagementOverview` (dados reais do banco) — apenas verifico se há mensagens de "sem dados" adequadas e ajusto se necessário.

## O que NÃO muda
- Estrutura visual, layout, cores, navegação.
- Server functions de CRUD (`createEmployee`, `createAbsence`, `createCandidate`) — continuam disponíveis para você popular dados de teste.
- Banco de dados — não há seed fictício a remover (já verifiquei: tabelas estão vazias).

## Resultado esperado
Ao abrir Dashboard e Gestão sem ter cadastrado ninguém, todos os números aparecem como `0` e listas vazias com mensagens tipo "Nenhum candidato cadastrado". Conforme você cadastrar colaboradores, candidatos e ausências, os gráficos e KPIs passam a refletir esses dados reais.
