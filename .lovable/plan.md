## Problema

Hoje o portal do candidato só usa OCR do currículo para pré-preencher o formulário. O OCR dos demais documentos (RG, CPF, CNH, comprovante etc.) é rodado no `finalizeDocumentUpload` e salvo em `documents.ocr_data`, mas **nunca é escrito no formulário** que o candidato revisa. Resultado:

- O candidato acha que a IA "não leu" o documento (os campos ficam vazios) e digita tudo à mão.
- O RH abre a ficha e vê os valores brutos vindos direto da IA em cada documento — muitos incorretos, sem revisão humana — e trata isso como se fosse o cadastro final.

O usuário quer: **os documentos pré-preenchem o formulário**, o candidato **edita e confirma**, e só então o RH recebe **os dados consolidados** (não o OCR bruto por documento).

## O que muda

### 1. `finalizeDocumentUpload` (`src/lib/candidate-public.functions.ts`)
- Já retorna o `doc` inserido. Passa a devolver também `ocr_fields` (o `ocr.fields` normalizado) para o cliente usar imediatamente.

### 2. Portal do candidato (`src/routes/c.$token.tsx`)
- Após cada upload de documento, mapear os campos OCR retornados para o `FormState` do candidato usando esta tabela (documento → campos do form):
  - RG/CIN, CNH → `full_name`, `rg`, `rg_emissao`, `data_nascimento`, `local_nascimento`, `nome_pai`, `nome_mae`
  - CPF → `full_name`, `cpf`, `data_nascimento`
  - Comprovante de residência → `endereco`
  - Certidão → `full_name`, `nome_pai`, `nome_mae`, `data_nascimento`
- Regra de precedência (não sobrescrever trabalho do candidato):
  1. Se o campo do form estiver **vazio** OU ainda **marcado como `autoFilled`** (nunca editado à mão), preencher com o valor do OCR.
  2. Se o candidato já editou o campo, **preservar** o valor digitado.
- Marcar os campos preenchidos como `autoFilled` (mesma dica visual do Sparkles já existente) para o candidato saber o que revisar.
- Toast: "N campos preenchidos automaticamente pelo seu <documento>".
- Nenhum novo componente visual: a etapa de Revisão (step 2) já expõe todos esses campos como editáveis.
- Manter validação cruzada e trava de submit em caso de divergência (já existe).

### 3. Ficha do RH (`src/routes/_authenticated/candidatos.$id.tsx`)
- Fonte de verdade para o RH passa a ser **exclusivamente** `candidate.form_data` (o cadastro consolidado pelo candidato) e as **imagens dos documentos** para conferência visual.
- Enquanto o candidato **não tiver enviado** (`form_data` ausente/vazio), a ficha mostra apenas:
  - Um aviso "Aguardando o candidato revisar e enviar o cadastro" no topo.
  - A lista de documentos com o preview do arquivo e status de upload.
  - **Sem** exibir os valores de OCR por documento e **sem** o botão "Editar OCR".
- Após o envio (`form_data` preenchido), a aba Documentos passa a mostrar por documento:
  - Preview do arquivo.
  - Os valores **do formulário confirmado pelo candidato** relacionados àquele documento (não mais o OCR bruto), com badge "Confirmado pelo candidato".
  - O RH continua podendo editar via "Editar ficha" (`updateCandidateForm`), que já existe.
- A aba "Conferência cruzada" continua funcionando, mas alimentada por `form_data` (já é o comportamento atual via `extractDeclaredFromFormData`).
- O botão "Editar OCR" (`updateDocumentOcr`) fica escondido do fluxo padrão; só aparece em um menu "Avançado" na aba Documentos, para casos em que o RH precise corrigir dados extraídos antes de reabrir para o candidato.

### 4. Correção de leituras erradas — sem mudar o provider
A causa raiz de "dados incorretos" percebida pelo usuário é o OCR bruto sendo tratado como final. O fluxo acima já resolve isso ao obrigar revisão humana antes de consolidar. **Não** vamos alterar o `provider.server.ts` (modelo, prompt, temperatura) neste passo — as regras estritas atuais (sem invenção, retorno `null` quando ilegível, validação de CPF/data) permanecem.

## O que **não** muda

- Schema do banco, migrations, buckets de storage.
- `runOcr`, prompt do Gemini, modelo, resume-parser.
- Autenticação, LGPD, lixeira de documentos, dependentes.
- Design tokens, tipografia, layout geral.

## Ordem de execução

1. `finalizeDocumentUpload` retorna `ocr_fields`.
2. `c.$token.tsx`: helper `mergeOcrIntoForm(type, fields)` + hook no `uploadDoc` para atualizar `form`/`autoFilled` respeitando a precedência.
3. `candidatos.$id.tsx`: esconder OCR bruto quando `form_data` estiver vazio; após envio, renderizar valores consolidados a partir de `form_data`.
4. Teste manual: subir RG, ver campos aparecendo no form; editar um deles; subir CPF — campo editado deve permanecer; confirmar envio; abrir ficha RH e ver só o consolidado.
