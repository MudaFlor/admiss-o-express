# Fluxo LGPD + Auto-preenchimento no App do Candidato

Adicionar ao `/c/$token` uma etapa inicial de consentimento LGPD, upload de currículo com extração automática via Lovable AI (Gemini Vision), preenchimento inteligente do formulário e direito de exclusão.

## Mudanças no Banco

Nova tabela `lgpd_consents` (auditoria do aceite):

- `candidate_id`, `accepted_at`, `ip_address`, `user_agent`, `terms_version`

Novos campos em `candidates.form_data` (JSONB, sem alterar schema):

- `rg`, `rg_emissao`, `data_nascimento`, `local_nascimento`, `nome_pai`, `nome_mae`, `endereco`, `CPF`, `formacao[]`, `experiencias[]`, `competencias[]`

Nova coluna em `candidates`:

- `lgpd_accepted_at TIMESTAMPTZ` (flag rápida — bloqueia envio sem aceite)
- `deletion_requested_at TIMESTAMPTZ` (solicitação de exclusão)

Novo bucket de storage: já existe `candidate-documents`. Adicionar tipo `curriculo` ao enum `document_type`.

## Novo fluxo no `/c/$token` (4 etapas)

```text
[1] Termo LGPD  →  [2] Currículo + IA  →  [3] Revisão do form  →  [4] Documentos oficiais  →  Envio
```

### Etapa 1 — Consentimento LGPD

- Tela com texto do termo (uso exclusivo p/ R&S, retenção, direitos do titular).
- Checkbox obrigatório "Li e aceito".
- Botão "Continuar" desabilitado até aceite.
- Ao aceitar: server fn `acceptLgpdConsent` grava `lgpd_consents` (IP via `getRequestIP`, user-agent) e atualiza `candidates.lgpd_accepted_at`.
- Server bloqueia qualquer outra ação se `lgpd_accepted_at` for nulo.

### Etapa 2 — Upload de currículo + extração IA

- Dropzone aceitando PDF, DOCX, JPG, PNG (máx 10MB).
- Upload via signed URL no bucket `candidate-documents` (`curriculo` type).
- Loading "Analisando currículo…" com skeleton.
- Server fn `parseResume`:
  - Baixa o arquivo, gera signed URL pública temporária.
  - Chama Lovable AI Gateway (`google/gemini-2.5-flash`) com prompt estruturado + JSON schema (tool calling) para extrair: nome, cpf, rg, data_nasc, local_nasc, nome_pai, nome_mae, email, telefone, endereço, linkedin, formação[], experiências[], competências[].
  - Para PDF/imagem: envia como `image_url` (Gemini suporta multimodal). Para DOCX: extrai texto com `mammoth` no server e envia como texto.
  - Retorna objeto parcial — campos não encontrados ficam `null`.
- Toast "Dados extraídos com sucesso" + badge mostrando quantos campos foram preenchidos.

### Etapa 3 — Revisão e edição

- Form com todos os campos pré-preenchidos pela IA, **todos editáveis**.
- Indicador visual ⚡ ao lado de campos preenchidos automaticamente (some ao editar).
- Seções: Dados pessoais / Contato / Endereço / Formação (lista dinâmica) / Experiências (lista dinâmica) / Competências (tags) / LinkedIn.
- Validação Zod no envio.

### Etapa 4 — Documentos oficiais

- Mantém o fluxo atual (RG, CPF, comprovante residência, CNH se motorista).

## Privacidade & Direitos do Titular

- Rodapé persistente: "Seus dados são protegidos pela LGPD. [Solicitar exclusão]".
- Botão "Solicitar exclusão" → server fn marca `deletion_requested_at`, dispara notificação para o RH.
- Painel RH: badge em candidatos com solicitação pendente; ação "Excluir definitivamente" remove documentos do storage + linha do candidato.
- Documentos no bucket privado (já é). Acesso via signed URLs apenas.

## Arquivos a criar/editar

**Migration**

- `lgpd_consents` table + RLS (insert público via server, select só dono)
- `candidates.lgpd_accepted_at`, `candidates.deletion_requested_at`
- enum `document_type` += `curriculo`

**Server functions** (`src/lib/candidate-public.functions.ts`)

- `acceptLgpdConsent({ token })` — registra IP/UA
- `parseResume({ token, storage_path })` — chama Gemini, retorna JSON
- `requestDataDeletion({ token })`

**Lib novo**

- `src/lib/ai/resume-parser.server.ts` — chamada Lovable AI + schema
- `bun add mammoth` para DOCX

**Frontend** (`src/routes/c.$token.tsx`)

- Refatorar em 4 sub-etapas com state machine simples
- Componentes: `LgpdConsentStep`, `ResumeUploadStep`, `ResumeReviewForm`, `OfficialDocsStep` (atual)

**RH** (`src/routes/_authenticated/candidatos.$id.tsx`)

- Mostrar timestamp de aceite LGPD + IP
- Botão de exclusão definitiva quando `deletion_requested_at` setado

## Stack técnica

- IA: Lovable AI Gateway, modelo `google/gemini-2.5-flash` (multimodal, suporta PDF/imagem direto, sem custo de API key extra).
- DOCX: `mammoth` (puro JS, compatível Worker).
- Validação: Zod em todos os inputs server.
- Segurança: bucket privado, signed URLs, RLS, IP capturado via `getRequestIP` do TanStack.

## Fora de escopo (próxima iteração)

- Versionamento do termo LGPD (string `terms_version` já fica preparada).
- Re-extração se o candidato trocar o currículo (substituiria o doc atual).
- Notificação por email da exclusão.

Posso seguir com a implementação?