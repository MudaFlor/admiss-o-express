## Objetivo

Deixar o sistema pronto para receber **dados reais** com segurança e registrar o **aceite do termo LGPD** como assinatura digital rastreável (quando, de onde, em qual aparelho, com qual texto do termo e hash de integridade).

---

## Parte 1 — Assinatura digital do termo LGPD

### 1.1 Ampliar `lgpd_consents` (migration)

Novos campos na tabela existente:

- `terms_text` (text, not null) — corpo do termo exibido no momento do aceite.
- `terms_hash` (text, not null) — SHA-256 do `terms_text + terms_version` (integridade).
- `signature_name` (text, not null) — nome digitado pelo candidato como assinatura.
- `signature_cpf` (text, not null) — CPF confirmado na assinatura (validado).
- `accepted_at` (já existe) — timestamp servidor (fonte da verdade da hora).
- `ip_address` (já existe) — IP capturado no servidor.
- `user_agent` (já existe) — UA capturado no servidor.
- `device_info` (jsonb) — plataforma, idioma, timezone, tela, tipo (mobile/desktop) — coletados no cliente.
- `geolocation` (jsonb, nullable) — `{lat, lng, accuracy, source: "gps"|"ip"}` — só se o candidato **autorizar** (Geolocation API); nunca obrigatório.
- `geo_consent` (boolean) — se o candidato autorizou capturar localização.
- `revoked_at` (timestamptz, null) — para direito de revogação LGPD.

RLS: mantém insert via service role (server fn). Nenhum acesso anônimo. RH lê via política já existente.

### 1.2 Fluxo de assinatura no portal (`c.$token.tsx`)

Substituir o simples checkbox atual por uma **etapa de assinatura**:

1. Exibir o termo LGPD completo (rolável, com versão visível).
2. Campo "Digite seu nome completo" (deve bater com `full_name`).
3. Campo "Confirme seu CPF" (validado com `isValidCpf`).
4. Toggle opcional: "Permitir registro de localização para maior segurança jurídica" → dispara `navigator.geolocation.getCurrentPosition` (permissão do navegador).
5. Coletar `device_info` do cliente: `navigator.userAgent`, `platform`, `language`, `screen.{width,height}`, `Intl.DateTimeFormat().resolvedOptions().timeZone`.
6. Botão "Assinar e aceitar" → chama `acceptLgpdConsent` com esses dados.

Sem localização = aceite válido, apenas sem esse dado (LGPD não exige geo).

### 1.3 `acceptLgpdConsent` (server fn)

- Recebe: `token`, `signature_name`, `signature_cpf`, `device_info`, `geolocation?`, `geo_consent`.
- Valida nome/CPF contra `candidates.full_name` / `candidates.cpf`.
- Captura server-side: `accepted_at = now()`, `ip_address` (via `getRequestIP`), `user_agent` (via `getRequestHeader`).
- Monta `terms_text` (constante versionada em `src/lib/lgpd/terms.ts`) + `terms_hash` (SHA-256 no servidor).
- Insere em `lgpd_consents` (nunca sobrescreve — cada aceite gera nova linha auditável).
- Atualiza `candidates.lgpd_accepted_at` apenas na primeira vez.

### 1.4 Visualização para o RH (`candidatos.$id.tsx`)

Nova aba/seção **"Termo LGPD assinado"** mostrando:
- Nome/CPF assinados, data/hora, IP, UA, dispositivo, geolocalização (se houver).
- Versão + hash do termo.
- Botão "Baixar comprovante (PDF)" — gerado server-side com todos os campos.

---

## Parte 2 — Hardening para dados reais

### 2.1 Endurecer RLS e permissões

- Revisar todas as policies das tabelas (`candidates`, `documents`, `dependents`, `lgpd_consents`, `employees`, `notifications`) para garantir:
  - Nenhum `TO anon` SELECT em dados pessoais.
  - RH só vê o que tem role adequada (via `has_role`).
  - Bucket `candidate-documents` continua privado; acesso só via signed URL curta (10 min já é o padrão).

### 2.2 Retenção e direito ao esquecimento

- Cron já existe para lixeira de documentos (30 dias). Adicionar cron para:
  - Purga automática de candidatos com `deletion_requested_at` > 30 dias (dados + documentos + dependentes; consents ficam por 5 anos anonimizados como prova legal).

### 2.3 Auditoria

Nova tabela `audit_logs`:
- `actor_user_id`, `actor_role`, `action` (`view_candidate`, `edit_form`, `edit_ocr`, `delete_doc`, `restore_doc`, `approve`, `reject`, `export`), `entity`, `entity_id`, `metadata`, `ip`, `ua`, `created_at`.
- Server fns do RH gravam log em cada operação sensível.
- Aba "Auditoria" na ficha do candidato para o RH admin.

### 2.4 Rate limiting no portal público

- Limitar `getCandidateByToken` e `finalizeDocumentUpload` por IP (janela deslizante em memória Cloudflare Workers via `Map` + TTL; suficiente para MVP).
- Bloquear brute-force de tokens.

### 2.5 Verificações operacionais (checklist entregue ao usuário, não código)

- Publicar em domínio próprio com HTTPS.
- Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se já compartilhada.
- Backup: usar Cloud → Advanced settings → Export data periodicamente.
- Nomear DPO e publicar política de privacidade pública.
- Testar fluxo ponta-a-ponta com dados sintéticos antes de abrir para candidatos reais.

---

## Ordem de execução

1. Migration: expandir `lgpd_consents` + criar `audit_logs` (+ GRANTs + RLS).
2. `src/lib/lgpd/terms.ts` — texto do termo v1 + função `hashTerms`.
3. Reescrever `acceptLgpdConsent` para receber a assinatura completa.
4. Nova etapa de assinatura em `c.$token.tsx` (substitui checkbox).
5. Server fn `getLgpdConsent(candidateId)` + seção "Termo assinado" em `candidatos.$id.tsx`.
6. Server fn `generateLgpdReceipt` (PDF simples via HTML→string, download).
7. Wrappers de auditoria nas server fns sensíveis do RH.
8. Cron de purga de candidatos com deleção solicitada.

## O que **não** muda

- Schema de candidatos/documentos/dependentes.
- Fluxo de OCR e pré-preenchimento (já implementado).
- Design, layout, tipografia.
