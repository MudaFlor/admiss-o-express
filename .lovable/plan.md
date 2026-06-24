# Validação cruzada entre documentos

Comparar automaticamente os dados extraídos via OCR de cada documento do candidato e sinalizar divergências, tanto para o candidato (no portal) quanto para o RH (na ficha).

## Regras de cruzamento

Campos comparados entre todos os documentos onde aparecerem:


| Campo              | Documentos                                   | Como comparar                                                                      | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| ------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | ------ | ------ | ------ | ------ | ------ |
| CPF                | CPF, RG/CIN, CNH                             | normalizar dígitos, deve conter 11 digitos, igualdade exata;                       | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| Nome completo      | RG/CIN, CPF, CNH, certidão, título, PIS, SUS | upper + sem acento + colapsar espaços; aceitar subconjunto (nome social/abreviado) | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| Data de nascimento | RG/CIN, CPF, CNH                             | DD/MM/AAAA, igualdade exata                                                        | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| Nome da mãe        | RG/CIN                                       | mesmo normalizador de nome                                                         | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| Nome do pai        | RG/CIN                                       | mesmo normalizador de nome                                                         | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |


Para cada campo, define-se um "valor de referência" pela ordem de confiança: CPF > RG/CIN > CNH > certidão > título > currículo. Os demais são comparados contra ele.

Resultado por campo: `ok`, `divergente` (com lista de origens conflitantes) ou `ausente`.

## Onde rodar

Função pura `crossCheckCandidate(candidateId)` em `src/lib/validation/cross-check.server.ts`:

- lê `candidates.form_data` + todos os `documents` do candidato (apenas `ocr_fields`, sem baixar arquivos);
- aplica os normalizadores;
- devolve `{ summary: { ok, divergente, ausente }, fields: [{ campo, referencia, valores: [{origem, valor, confianca}], status }] }`.

Exposta por server function `getCandidateCrossCheck` (em `candidate-public.functions.ts` para o portal — autenticada por token — e reutilizada em `candidates.functions.ts` para o RH).

Roda automaticamente:

- ao final de cada `finalizeDocumentUpload` (recalcula e guarda em `candidates.form_data.cross_check`, para evitar custo de recomputar no list);
- sob demanda nas duas telas.

Sem nova migration: o resultado é serializável e mora no JSONB existente.

## UI candidato (`src/routes/c.$token.tsx`)

Novo bloco "Conferência cruzada" na etapa de Revisão:

- contador "X divergências encontradas";
- lista por campo divergente mostrando cada origem com o valor lido e a confiança;
- botão "Corrigir documento" rola até o card do documento culpado;
- submit bloqueado enquanto houver status `divergente` não justificado (checkbox "Confirmo que os dados estão corretos apesar da divergência", gravado em `form_data.cross_check_overrides`).

## UI RH (`src/routes/_authenticated/candidatos.$id.tsx`)

Nova aba "Conferência" (ou bloco no topo da aba Documentos):

- badge no topo do candidato: verde "Sem divergências" / âmbar "N divergências";
- tabela por campo com colunas Campo | Referência | Documento | Valor | Confiança | Status;
- linhas divergentes destacadas; se o candidato marcou override, mostrar "Justificado pelo candidato".

## O que não muda

- OCR provider, schema do banco, fluxo de upload, autenticação, dashboard, design tokens.
- Confiança por campo (badges verde/amarelo) continua existindo em paralelo — cobre o caso "li com pouca certeza"; o cross-check cobre "li bem mas não bate com outro doc".

## Ordem de execução

1. `src/lib/validation/cross-check.server.ts` + helpers de normalização.
2. Server functions `getCandidateCrossCheck` (token público) e versão RH.
3. Hook em `finalizeDocumentUpload` para persistir `form_data.cross_check`.
4. UI portal (etapa Revisão).
5. UI RH (aba/bloco Conferência).
6. Teste manual: subir RG + CPF com CPFs diferentes e confirmar bloqueio.