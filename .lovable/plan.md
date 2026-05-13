# Plataforma de Admissão Digital — Plano de Construção

Direção visual escolhida: **Clinical Precision** (Plus Jakarta Sans + Inter, paleta indigo `#4F46E5` sobre `#F8FAFC`, sidebar branca, cantos suaves, badges de status coloridos).

## Stack
- TanStack Start + React + Tailwind v4 (já no template)
- **Lovable Cloud** (Supabase): Auth, Postgres com RLS, Storage para documentos
- Server functions (`createServerFn`) para gerar links, OCR mockado, aprovação
- shadcn/ui + lucide-react + sonner (toasts)

## Escopo do MVP (confirmado)
- WhatsApp via link compartilhável (sem API oficial agora — botão "compartilhar" com `wa.me`)
- OCR mockado (campos editáveis pré-preenchidos com dados fake, estrutura pronta para Lovable AI Gateway)
- Documentos: RG, CPF, CNH, comprovante de residência
- Roles separadas (`admin`, `rh`) em tabela `user_roles`

---

## 1. Backend — schema do Lovable Cloud

### Tabelas
- `profiles` (id ref `auth.users`, full_name, company_name, created_at)
- `user_roles` (id, user_id, role: enum `admin`|`rh`) + função `has_role()` SECURITY DEFINER
- `candidates`
  - id, created_by (rh user), full_name, cpf, email, phone, position
  - status: enum `pendente` | `em_analise` | `aprovado` | `rejeitado`
  - access_token (uuid único do link), token_expires_at
  - form_data (jsonb — ficha pré-preenchida)
  - rejection_reason, reviewed_by, reviewed_at
- `documents`
  - id, candidate_id, type: enum `rg`|`cpf`|`cnh`|`comprovante_residencia`
  - storage_path, ocr_data (jsonb), ocr_confidence, status, uploaded_at

### Storage
- Bucket privado `candidate-documents` — path: `{candidate_id}/{doc_type}-{uuid}.{ext}`

### RLS
- `candidates`: RH vê os próprios; admin vê todos; candidato anônimo lê via `access_token` (server fn valida)
- `documents`: mesmo padrão via join com candidate
- `user_roles`: leitura própria; admin gerencia
- Storage: insert público via signed URL gerada por server fn; leitura só autenticada

### Server functions (`src/lib/*.functions.ts`)
- `createCandidate` (auth RH) — cria candidato + token, retorna link
- `getCandidateByToken` (público) — valida token, retorna estado da ficha
- `uploadDocument` (público com token) — gera signed upload URL
- `runOcrMock` — simula OCR; retorna dados estruturados; preparado para trocar por Lovable AI (Gemini Vision)
- `approveCandidate` / `rejectCandidate` (auth RH)
- `validateCpf` — algoritmo de dígito verificador (sem chamar Receita)

---

## 2. Rotas

### Públicas
- `/` — landing curta (produto, "para RH" / login)
- `/login` — email/senha + Google
- `/c/$token` — jornada do candidato (mobile-first):
  1. Boas-vindas + dados básicos (nome, CPF, telefone)
  2. Upload guiado dos 4 documentos (com preview, progresso)
  3. Confirmação da ficha pré-preenchida pelo OCR (editável)
  4. Tela "Enviado — em análise"

### Autenticadas (`/_authenticated/`)
- `/dashboard` — visão geral: contadores por status, fila de pendências
- `/candidatos` — tabela com filtros (status, data), busca, ação "novo candidato" (modal → gera link, botão copiar + compartilhar WhatsApp)
- `/candidatos/$id` — tela de revisão (split: documento + dados OCR editáveis + aprovar/rejeitar; ficha completa em aba)
- `/configuracoes` — perfil + (admin) gestão de usuários/roles

### Layout
- Sidebar branca + topbar (padrão Clinical Precision)
- Mobile do candidato: sem sidebar, header minimal com logo + step indicator

---

## 3. Componentes-chave
- `CandidateStatusBadge` (cores por status)
- `DocumentUploadCard` (mobile, com câmera)
- `OcrReviewPanel` (split documento/dados, igual ao protótipo)
- `CandidateTable` (com progresso por linha)
- `ShareWhatsAppButton` (`wa.me/?text=...`)
- `Stepper` para mobile

---

## 4. Estrutura para integrações futuras (sem implementar agora)
- `src/lib/integrations/serpro.server.ts` — stub com TODO + interface
- `src/lib/integrations/whatsapp.server.ts` — stub para WhatsApp Cloud API
- `src/lib/ocr/provider.ts` — interface comum; impl `mock` ativa, impl `gemini` esboçada usando Lovable AI Gateway
- README documentando onde plugar credenciais

---

## 5. Notificações (MVP simples)
- Toasts via sonner no admin
- Tabela `notifications` (jsonb event log) — base para automação futura
- Email de aprovação/rejeição via Lovable Email (opcional, deixar interface pronta)

---

## 6. Ordem de implementação
1. Habilitar Lovable Cloud + criar schema (migration)
2. Auth (email/senha + Google) + roles + rota `_authenticated`
3. Página de candidatos + criação + cópia de link
4. Jornada `/c/$token` mobile-first com upload + storage
5. OCR mock + tela de revisão `/candidatos/$id`
6. Aprovação/rejeição + status + dashboard
7. Polimento visual (Clinical Precision tokens) + landing + SEO heads

---

## Detalhes técnicos
- Validação com **zod** em todos os server fns
- CPF: validar formato + dígito; armazenar normalizado
- Token de acesso: uuid v4, expira em 7 dias (configurável)
- Auditoria: `reviewed_by` + `reviewed_at` em candidates; log em `notifications`
- SEO: `head()` único por rota; landing com og:image gerado
- Sem dependências Node-only no servidor Worker

Posso começar pela ativação do Cloud + schema. Aprova?