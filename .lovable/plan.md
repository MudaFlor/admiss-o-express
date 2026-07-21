## Fase 1 — Admissão Inteligente (produção)

Objetivo: eliminar trabalho manual, aumentar confiabilidade do OCR, validar automaticamente cada dado, comparar documentos entre si, guiar candidato e RH por um workflow claro e registrar tudo em auditoria. Nada existente é removido; tudo é aditivo.

---

### 1. OCR inteligente com auto-detecção de tipo

Hoje o OCR só roda para o `document_type` escolhido pelo candidato. Vamos torná-lo tolerante à ordem e ao rótulo.

- `src/lib/ocr/classifier.server.ts` (novo): 1ª chamada Gemini Vision devolve `{ detected_type, confidence, orientation_hint }`. Se `detected_type ≠ type_escolhido` e confiança > 0.85, o backend usa o tipo detectado e devolve aviso ao candidato ("Detectamos que este é um RG, não um CPF — deseja confirmar?").
- `provider.server.ts`: adicionar pré-processamento — se `orientation_hint` indicar rotação, girar via `sharp`… **NÃO usar sharp (Node-only no Worker)**. Alternativa: pedir ao próprio Gemini para tratar rotação/recorte no prompt (ele já faz internamente) e apenas logar o hint.
- Expandir `FIELDS_BY_TYPE` para cobrir todos os campos pedidos: `nacionalidade`, `escolaridade`, `profissao`, `orgao_emissor` (já tem), separação de endereço (já tem em comprovante). Adicionar a **Carteira de Trabalho Digital (CTPS)** como tipo com OCR (hoje é `[]`).
- Regra dos 90%: já implementada por campo. Ajustar UI para nunca **pré-preencher** um campo com confiança < 0.9 — deixar vazio + badge "revisar".
- Guardar `detected_type`, `orientation_hint` e `quality_flags` (blurry/cropped/low-res) em `documents.ocr_data.meta`.

### 2. Validação inteligente por campo

Novo módulo `src/lib/validation/field-checks.ts` (puro, isomórfico):
- CPF válido (dígito), CEP existente (ViaCEP via fetch server-side), e-mail (regex razoável), telefone BR, datas coerentes (nascimento no passado, > 14 anos), CNH vencida, documento vencido, comprovante de residência < 90 dias, **CPF duplicado** (query em `candidates` + `employees`).
- Server fn `validateCandidateData(candidateId)` roda tudo e devolve `Array<{ field, level: "ok"|"warn"|"error", message }>`.
- UI: componente `ValidationBadge` (🟢🟡🔴) reutilizável no portal e na ficha RH; painel "Validações automáticas" na ficha.

### 3. Conferência cruzada (evolução do existente)

Já existe `src/lib/validation/cross-check.ts`. Ampliar comparações:
- Endereço declarado × comprovante (normalizar rua/número/CEP).
- Filiação entre RG, CNH e certidões.
- Data de nascimento entre RG/CNH/CPF/título.

Nunca sobrescreve; só sinaliza. Já há painel no portal e aba no RH — apenas estender o conjunto de regras.

### 4. Checklist inteligente por perfil + config por empresa

- Nova tabela `document_requirements` (por empresa/cargo): `{ id, company_id?, role_pattern text, document_type, condition jsonb }` onde `condition` cobre `gender=male`, `marital_status=married`, `has_dependents=true`, `role_contains=motorista`.
- Server fn `getRequiredDocuments(candidateId)` devolve a lista dinâmica; substitui a checagem hardcoded de "CNH só para motorista" e adiciona "reservista para homem", "certidão de casamento se casado", etc.
- Tela `/configuracoes` ganha aba **"Documentos obrigatórios"** para o RH editar as regras (CRUD simples).

### 5. Workflow visual com status estendido

- Novo enum `candidate_stage` com as 11 etapas pedidas (cadastro_iniciado … admitido). Mantém o `status` legado (`em_analise`/`aprovado`/`rejeitado`) por compatibilidade — o `stage` é derivado/complementar.
- Coluna `candidates.stage`, `candidates.stage_updated_at`, `candidates.stage_updated_by`, `candidates.stage_note`.
- Nova tabela `candidate_stage_history` (id, candidate_id, from_stage, to_stage, actor_user_id, note, created_at) — trilha completa.
- Server fn `advanceCandidateStage(id, to, note)` + botões na ficha RH. Portal do candidato mostra badge do estágio atual.
- Componente `StageTimeline` (horizontal em desktop, vertical em mobile) na ficha e no portal.

### 6. Comunicação automática (WhatsApp + e-mail)

- Nova tabela `message_templates` (`kind`, `channel`, `subject`, `body`, variáveis `{{nome}}`, `{{link}}`, `{{motivo}}`).
- Seed dos modelos: convite, solicitação de docs, pendência, correção, aprovação, reprovação, confirmação de recebimento.
- Novo módulo `src/lib/messaging.server.ts`: `sendCandidateMessage(candidateId, kind, extra?)` — resolve template, dispara via `whatsapp.ts` existente + e-mail (Resend). Registra em nova tabela `messages_log`.
- Triggers automáticos: ao gerar link (convite), ao mudar stage (pendência/aprovação/reprovação/admitido), ao finalizar upload (confirmação).
- Aba **"Comunicação"** na ficha do candidato mostra histórico.
- Requer secret `RESEND_API_KEY` (`add_secret`) — pergunto ao usuário no momento do build se quer habilitar e-mail agora ou só WhatsApp.

### 7. Experiência do candidato

Enriquecer `/c/$token` (mobile-first, já é):
- **Barra de progresso** por seções (Aceite → Currículo → Ficha → Documentos → Dependentes → Envio) com percentual.
- **Checklist lateral/topo** de documentos pendentes (usa `getRequiredDocuments`).
- **Feedback de qualidade**: após upload, o classificador devolve `quality_flags`; se `blurry/cropped/low_res`, mostrar aviso "Imagem pouco legível — deseja reenviar?" sem bloquear.
- **Substituir documento** antes do envio final: botão "Reenviar" faz soft-delete + upload novo (já temos a base).
- **Auto-save**: já persistimos ficha/dependentes em cada blur. Adicionar indicador "Rascunho salvo há X min" + resumo restaurado ao reabrir o link.
- Pré-visualização de imagens/PDF (já existe) — expandir para dependentes.

### 8. Auditoria universal

Já existe `audit_logs` + `logAudit`. Ampliar cobertura:
- Wrappers em todas as server fns sensíveis: upload/exclusão/restauração de doc, edição de básicos/ficha/OCR, validação, mudança de stage, envio de mensagens, aceite LGPD, divergências detectadas.
- Nova aba **"Auditoria"** na ficha do candidato (lista paginada por data, com actor, ação, IP, UA, metadata).
- Portal público continua sem PII em `/api/public/*`.

---

### Ordem de execução (build)

1. Migration: `candidate_stage` enum + colunas + `candidate_stage_history` + `document_requirements` + `message_templates` + `messages_log`; GRANTs + RLS.
2. OCR: classificador + expansão de campos + CTPS + `quality_flags`.
3. Módulo `field-checks` + server fn `validateCandidateData` + `ValidationBadge`.
4. Ampliar `cross-check` (endereço, filiação, nascimento).
5. Checklist dinâmico (`getRequiredDocuments`) + tela de config.
6. Stage/workflow + timeline + botões.
7. Messaging (templates + envio + gatilhos + aba histórico).
8. Portal: progresso, checklist, qualidade, auto-save UX, substituir doc.
9. Wrappers de auditoria + aba Auditoria.

### Fora do escopo desta fase (fica para próxima)

- Integração com folha/eSocial.
- Assinatura eletrônica de contrato.
- Onboarding pós-admissão.
- App nativo.

### Perguntas antes de executar

1. **E-mail**: habilito envio agora via Resend (peço a chave) ou só WhatsApp nesta fase?
2. **Config por empresa**: hoje o sistema é single-tenant — as regras de documentos ficam globais (para o RH da Mudaflor) ou já preparo por `company_id`?
3. **Templates**: seed em português-BR padrão e o RH edita depois, ok?