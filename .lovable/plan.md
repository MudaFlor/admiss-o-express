
## Objetivo

Transformar o portal de admissão atual (RG, CPF, CNH, comprovante de residência) em um portal completo que coleta todos os documentos exigidos, extrai dados via OCR/IA com indicador de confiança e gerencia dependentes.

## Documentos suportados (novos + existentes)

| Documento | OCR? | Obrigatório | Observação |
|---|---|---|---|
| CPF | sim | sempre | já existe |
| RG ou CNH | sim | sempre (um dos dois) | CNH deixa de ser exclusiva de motorista |
| CTPS Digital | parcial | sempre | CPF + arquivo opcional |
| Título de Eleitor | sim | sempre | inscrição, zona, seção |
| Foto 3x4 | não | sempre | câmera ou upload, validação de tamanho |
| Certidão Nascimento/Casamento | sim | sempre | nome, filiação, estado civil, registro/livro/folha |
| Reservista | não | só sexo masculino | upload simples |
| PIS/PASEP ou NIT | sim | sempre | número PIS/NIT |
| Comprovante de Residência | sim | sempre | endereço completo (já existe, expandir campos) |
| Comprovante de Escolaridade | não | sempre | histórico, diploma ou declaração |
| Certificados de Cursos | não | opcional | múltiplos arquivos |
| Comprovante de Vacinação Covid | não | opcional | upload |
| Cartão SUS | sim | opcional | número |
| Dependentes (cada um) | sim parcial | condicional | ver seção abaixo |

## Estrutura técnica

### Banco (uma migration)
- `ALTER TYPE document_type` adicionar: `ctps`, `titulo_eleitor`, `foto_3x4`, `certidao`, `reservista`, `pis_pasep`, `escolaridade`, `certificado_curso`, `vacinacao_covid`, `cartao_sus`, `dependente_certidao`, `dependente_rg_cpf`, `dependente_vacinacao`, `dependente_escolar`.
- `documents`: remover restrição "um por tipo" → permitir múltiplos arquivos por tipo (cursos, dependentes). Adicionar coluna `dependent_id uuid null`, `label text null`.
- Nova tabela `dependents(id, candidate_id, full_name, birth_date, cpf, rg, relationship, created_at, updated_at)` com GRANTs + RLS (RH lê tudo via has_role; service_role full).
- `candidates`: adicionar colunas estruturadas em `form_data` (manter JSONB) — não criar colunas físicas para campos opcionais; só validar via Zod. Adicionar `sexo text`, `cor_raca text`, `estado_civil text` opcionais para facilitar query.

### OCR (src/lib/ocr/provider.server.ts)
- Expandir `FIELDS_BY_TYPE` para cada novo tipo:
  - `titulo_eleitor`: inscrição, zona, seção, nome, data_nascimento
  - `certidao`: nome, nome_pai, nome_mae, data_nascimento, estado_civil, conjuge, registro, livro, folha, termo
  - `pis_pasep`: pis, nit, nome
  - `cartao_sus`: numero_sus, nome
  - `comprovante_residencia`: logradouro, numero, complemento, bairro, cidade, uf, cep, titular
- Manter regra estrita: nunca inventar; retornar null sem evidência.
- Retornar `confidence` por campo (não só global) — extender schema da tool function: cada campo retorna `{valor, evidencia, confianca}` (0–1).
- Tipos sem OCR (`foto_3x4`, `reservista`, `escolaridade`, `certificado_curso`, `vacinacao_covid`, `ctps`) pulam IA e gravam só o arquivo.

### Server functions (src/lib/candidate-public.functions.ts)
- `createDocumentUploadUrl` / `finalizeDocumentUpload`: aceitar todos os novos tipos + `dependent_id` opcional.
- Nova `listDependents`, `upsertDependent`, `removeDependent`.
- `submitCandidateApplication`: validar documentos obrigatórios conforme sexo (reservista) e existência de dependentes.

### UI candidato (src/routes/c.$token.tsx)
- Reestruturar em etapas:
  1. LGPD (mantém)
  2. Currículo (mantém, opcional)
  3. Informações complementares (sexo, cor/raça, estado civil, e-mail validado)
  4. Upload de documentos — lista com cards por documento, ícone de câmera para mobile, indicador "extraído com X%" e formulário pré-preenchido editável por documento.
  5. Dependentes — pergunta sim/não; se sim, lista + botão "Adicionar dependente" abrindo modal com nome, parentesco, data nascimento e uploads condicionais (certidão sempre, RG/CPF se ≥21, vacinação se <7, escolar opcional).
  6. Revisão final + envio.
- Para cada campo extraído: badge verde "✓ IA 95%" se ≥90, badge amarelo "⚠ Confirme" se <90 + borda destacada, bloqueio do submit enquanto houver campos amarelos não confirmados.
- Auto-save a cada upload (já é o comportamento); barra de progresso por documento e geral.
- Mobile-first: `capture="environment"` nos inputs de arquivo para abrir câmera direto.

### UI RH (src/routes/_authenticated/candidatos.$id.tsx)
- Exibir todos os novos documentos no painel de anexos (já tem botão editar/salvar — estender para os novos tipos).
- Aba "Dependentes" listando cada um com seus arquivos.
- Mostrar percentual de confiança ao lado de cada campo extraído.

## O que não muda
- Fluxo de criação de link, autenticação RH, status do candidato, dashboard, gestão.
- Estilo visual e design tokens.
- Tabelas existentes além das alterações listadas.

## Ordem de execução
1. Migration (enum + dependents + colunas).
2. OCR provider (novos tipos + confiança por campo).
3. Server functions (uploads multi-tipo + dependentes).
4. UI candidato (etapas + dependentes + indicadores de confiança).
5. UI RH (novos anexos + aba dependentes).
6. Testes manuais com documentos reais via preview.

## Pontos de atenção
- Reservista vira condicional ao sexo declarado na etapa 3 — se sexo = masculino e não enviado, bloqueia submit.
- Múltiplos arquivos no mesmo `type` (cursos, vacinação) exigem remover a lógica atual de "deletar antes de inserir" só para tipos single-instance.
- LOVABLE_API_KEY já configurada — sem novos segredos.
