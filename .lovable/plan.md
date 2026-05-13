# Próximos passos da implementação

Backend e tokens de design já estão prontos (Cloud + schema + paleta Clinical Precision). Agora vou construir o restante na seguinte ordem:

## 1. Autenticação e layout autenticado
- Configurar auth (email/senha + Google via `lovable.auth.signInWithOAuth`)
- `attachSupabaseAuth` no `src/start.ts`
- `/login` com tabs login/cadastro + reset de senha (`/reset-password`)
- Layout `_authenticated.tsx` com `beforeLoad` (redireciona p/ `/login`) + sidebar branca (Dashboard, Candidatos, Configurações) e topbar com perfil

## 2. Server functions (`src/lib/*.functions.ts`)
- `candidates.functions.ts`: `createCandidate`, `listCandidates`, `getCandidateById`, `approveCandidate`, `rejectCandidate`
- `candidate-public.functions.ts`: `getCandidateByToken`, `submitCandidateForm`, `createDocumentUploadUrl`, `runOcrMock`
- `lib/cpf.ts` (validador) + `lib/integrations/{serpro,whatsapp}.server.ts` + `lib/ocr/provider.ts` (stubs)
- Validação com zod em todas

## 3. Páginas autenticadas
- `/dashboard`: cards de contadores por status + fila de pendências
- `/candidatos`: tabela com filtros/busca + modal "Novo candidato" (form → gera link, copiar + botão WhatsApp `wa.me`)
- `/candidatos/$id`: split documento (signed URL) + dados OCR editáveis + aprovar/rejeitar com motivo + abas (Ficha, Documentos, Histórico)
- `/configuracoes`: perfil + (admin) gestão de roles

## 4. Jornada mobile do candidato `/c/$token`
- Rota pública, mobile-first, header minimal + Stepper
- Etapas: boas-vindas → dados básicos → upload guiado dos 4 documentos (câmera + preview + progresso) → revisão da ficha pré-preenchida (OCR mock) → tela "enviado em análise"
- Validação de token (expira em 7 dias) com tela de erro amigável

## 5. Landing `/` + SEO
- Hero, "Como funciona", "Para RH", CTA login
- `head()` único por rota (title, description, og:*)
- H1 único, alt em imagens, viewport, JSON-LD Organization

## 6. Polimento
- Toasts via sonner em todas as ações
- Inserts em `notifications` para eventos chave (criado, enviado, aprovado, rejeitado)
- Skeletons + estados vazios + tratamento de erro
- Verificação final do build e correção do runtime error atual

## Notas técnicas
- Storage: server fn gera signed upload URL para `candidate-documents/{candidate_id}/{type}-{uuid}.{ext}`; leitura via signed URL (60s) na revisão
- Token público: candidato envia o token no body; server fn valida `token_expires_at` antes de qualquer operação
- OCR mock: retorna campos plausíveis por tipo (RG/CPF/CNH/comprovante) com `confidence` 0.7-0.95; interface pronta para trocar por Gemini Vision via Lovable AI Gateway
- Sem chamadas à Receita/Serpro nem WhatsApp API agora — apenas stubs documentados

Posso seguir?
