## Objetivo

Mostrar a pré-visualização das imagens dos documentos para o candidato logo após o upload, na tela `/c/$token`.

## Mudanças

### 1. `src/lib/candidate-public.functions.ts`
- Em `getCandidateByToken`, incluir `storage_path` no select de `documents` e gerar uma `signed_url` (válida por ~10 min) para cada documento via `supabaseAdmin.storage.from("candidate-documents").createSignedUrl(...)`.
- Retornar cada documento com `{ id, type, status, storage_path, signed_url, uploaded_at, ... }`.

### 2. `src/routes/c.$token.tsx`
- Na lista de documentos do passo 3, quando `done === true` e existir `signed_url`:
  - Se for PDF (`/\.pdf$/i.test(storage_path)`): renderizar um ícone de PDF + botão "Visualizar" que abre `signed_url` em nova aba.
  - Caso contrário (imagem): renderizar uma miniatura `<img src={signed_url} />` (~64×64, `object-cover`, cantos arredondados, clicável para abrir em nova aba/lightbox simples).
- Mesmo tratamento para o currículo enviado no passo 2 (mostrar nome do arquivo + miniatura/ícone após upload concluído).
- Após "Trocar" um documento, invalidar a query para recarregar o `signed_url` novo.

### 3. Sem mudanças de backend/segurança
- Bucket continua privado, acesso somente via signed URL de curta duração — mantém conformidade LGPD.
- Sem alterações no fluxo do recrutador (já mostra os documentos).

## Fora de escopo
- Lightbox completo / zoom — apenas abrir em nova aba.
- Compressão/redimensionamento client-side.
