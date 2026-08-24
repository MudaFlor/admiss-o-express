# Auditoria de Segurança — Mudaflor People OS

Revisão feita sobre o código atual (rotas públicas, server functions, políticas do banco, configuração do worker) e sobre o scanner de segurança do backend. Abaixo estão apenas achados confirmados por leitura de código/consulta ao banco, ordenados por criticidade, com a correção proposta.

## Vulnerabilidades encontradas

### ALTA

**A1. Rotas de manutenção públicas permitem destruição em massa de dados**
`src/routes/api/public/hooks/purge-trash.ts` e `purge-candidates.ts` aceitam POST de qualquer pessoa, sem segredo, sem assinatura e sem rate limit, e executam com chave de serviço (ignora RLS). Um POST anônimo apaga documentos do storage, dependentes, notificações e candidatos elegíveis. Impacto: perda irreversível de dados e violação de disponibilidade.

Antes:
```ts
POST: async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // executa a purga direto
```
Depois:
```ts
POST: async ({ request }) => {
  const secret = process.env["CRON_SECRET"];
  const sent = request.headers.get("x-cron-secret") ?? "";
  if (!secret || sent.length !== secret.length ||
      !timingSafeEqual(Buffer.from(sent), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... purga
```
Correção: criar o segredo `CRON_SECRET`, exigir o header nas duas rotas, aplicar rate limit e responder sempre com corpo genérico.

**A2. Comprovante LGPD exposto sem autenticação**
`src/routes/api/consent-receipt/$id` lê com chave de serviço e devolve nome, CPF, e-mail, IP, dispositivo e geolocalização do candidato para qualquer requisição que tenha o UUID — sem sessão, sem token de portal e sem limite de tentativas. Impacto: exposição de dados pessoais sensíveis (LGPD).

Correção: exigir uma das duas provas — sessão de RH/Admin (Bearer + `is_hr`) ou o `access_token` do candidato dono do consentimento passado como query param — e registrar o acesso em `audit_logs`, com rate limit por IP e `Cache-Control: no-store`.

**A3. Ausência total de cabeçalhos de segurança / CSP**
O worker (`src/server.ts`) devolve as respostas sem `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ou HSTS. Como a sessão fica em `localStorage` (padrão do cliente do backend), qualquer XSS vira roubo de sessão, e a página é embutível em iframe de terceiros (clickjacking do fluxo do candidato).

Correção: envolver a resposta em `src/server.ts` com um injetor de headers para respostas HTML, com CSP em modo estrito para scripts próprios + backend + gateway de IA + fontes Google, e `frame-ancestors` limitado ao próprio site e ao preview do editor. O script inline de tema passa a usar hash na CSP.

**A4. Log de auditoria falsificável pelo cliente**
Política `Authenticated users can insert their own audit logs` valida só `actor_user_id = auth.uid()`; qualquer usuário autenticado pode inserir linhas com `actor_role = 'admin'` e ação arbitrária, corrompendo a trilha usada como prova. O app já grava auditoria pelo servidor (`src/lib/audit.server.ts`, chave de serviço), então a política de INSERT do cliente é desnecessária.

Correção (migração): remover a política de INSERT para `authenticated`, revogar `INSERT/UPDATE/DELETE` da tabela para `authenticated` (mantendo SELECT só para admin) e deixar a escrita apenas pelo servidor.

### MÉDIA

**M1. Funções `SECURITY DEFINER` executáveis por usuários logados**
O linter aponta funções definer chamáveis via API pelo papel `authenticated`. Correção: `REVOKE EXECUTE ... FROM authenticated, anon` nas funções internas (gatilhos e helpers), mantendo apenas `has_role`/`is_hr` se realmente forem usadas em políticas (políticas rodam como owner e não precisam de grant ao cliente).

**M2. Mensagens de erro internas repassadas ao cliente**
Há 41 pontos em `src/lib/*.functions.ts` com `throw new Error(error.message)`, devolvendo texto cru do banco (nomes de coluna, constraints, detalhes de política) ao navegador. Correção: um helper `failSafe(error, "mensagem amigável")` que loga o detalhe no servidor e lança mensagem genérica ao cliente; aplicar nos fluxos públicos primeiro (`candidate-public.functions.ts`) e depois nos autenticados.

**M3. Rate limit apenas em memória e só por IP**
`src/lib/rate-limit.server.ts` guarda contadores no isolate do worker: em produção há vários isolates, então o limite real é muito maior que o configurado, e um atacante distribuído passa. O portal usa token UUID v4 (entropia boa), mas força bruta continua barata. Correção: manter o limitador em memória como primeira barreira e adicionar contagem persistente (tabela `rate_limits` com chave + janela, escrita pelo servidor) nas rotas críticas: leitura por token, consentimento, upload e o comprovante LGPD. Bloqueio progressivo por token além do bloqueio por IP.

**M4. Storage `candidate-documents` sem políticas explícitas**
Hoje está fail-closed (nenhuma política = nenhum acesso direto) e todo acesso passa por URLs assinadas no servidor — comportamento correto. Correção: documentar isso na memória de segurança para não ser "corrigido" por engano com políticas amplas no futuro, e reduzir a validade das URLs assinadas de documentos de identidade para 5 minutos.

**M5. Extensão instalada no schema `public`** (linter). Correção: mover para o schema `extensions` na próxima migração de manutenção, se a extensão permitir.

### BAIXA

**B1. `dangerouslySetInnerHTML`** aparece em dois lugares: o script de tema em `__root.tsx` (string estática, sem entrada de usuário) e `components/ui/chart.tsx` (CSS gerado a partir de config estática). Não é XSS hoje; entram na CSP por hash e ficam com comentário de aviso.

**B2. Recibo LGPD monta HTML por template string** — já existe escape (`esc()`) em todos os campos dinâmicos. Manter e adicionar `esc()` obrigatório em qualquer campo novo.

**B3. Variáveis de ambiente** — o `.env` versionado contém apenas URL e chave publicável (uso previsto no cliente). Chave de serviço e chave de IA só são lidas via `process.env` dentro de handlers de servidor. Sem vazamento identificado. Único ajuste: garantir que `CRON_SECRET` entre pelo cofre de segredos, nunca no `.env` do repositório.

**B4. CORS** — não há handler configurando `Access-Control-Allow-Origin: *`; as server functions são same-origin. Sem ação, apenas manter a regra de não adicionar wildcard.

## O que será implementado

1. Migração no banco: remover INSERT de `audit_logs` para clientes + revogar grants de escrita; revogar EXECUTE das funções `SECURITY DEFINER` internas; criar tabela `rate_limits` (server-only, sem grants para `anon`/`authenticated`).
2. `CRON_SECRET` como segredo + verificação por comparação em tempo constante nas duas rotas de purga.
3. Autorização e auditoria no comprovante LGPD (`/api/consent-receipt/$id`), com `no-store`.
4. Middleware de cabeçalhos de segurança em `src/server.ts` (CSP com hash do script de tema, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
5. Helper de erro seguro e substituição de `error.message` cru nos fluxos públicos e nos server functions de candidatos/correções.
6. Rate limit persistente nas rotas públicas críticas + redução da validade das URLs assinadas.
7. Atualizar a memória de segurança com as decisões (storage fail-closed, auditoria só via servidor).

## Checklist de boas práticas (contínuo)

- Toda rota nova em `/api/public/*` nasce com verificação de segredo/assinatura + rate limit.
- Nenhum `supabaseAdmin` sem checagem explícita de quem está chamando.
- Toda entrada validada com Zod no servidor (já é o padrão do projeto) — manter limites de tamanho em uploads e textos.
- Nunca devolver `error.message` do banco ao cliente.
- Papéis sempre em `user_roles` + `has_role()`; nunca em `profiles` nem no cliente.
- Rodar o scanner de segurança e o linter do banco antes de cada publicação.
- Revisar CSP sempre que entrar um script/CDN externo — sem `unsafe-inline` para scripts.
