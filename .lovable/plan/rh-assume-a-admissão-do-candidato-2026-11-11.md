# RH assume a admissão do candidato

## O que muda para o RH
Na aba **Documentos & OCR** da ficha, o botão "Importar documento" passa a abrir uma confirmação: **"Assumir admissão pelo RH?"** (OK / Cancelar). Ao confirmar:

1. **Documentos já enviados pelo link são mantidos** e continuam na ficha com o OCR que já foi lido. Nada é apagado.
2. **O link do candidato é encerrado na hora.** Se ele abrir o link, verá "Este link foi encerrado. O RH está concluindo sua admissão." Ele não consegue mais enviar ou alterar nada.
3. **A ficha passa a ser editável pelo RH** em todos os campos do formulário: dados pessoais, endereço, contato, raça/cor, documentos revisados e dependentes. Os campos faltantes ficam destacados em vermelho, com uma lista "O que falta".
4. O RH importa os documentos que faltam (já funciona) e clica em **"Concluir dados e seguir admissão"**. As mesmas regras do link se aplicam: documentos obrigatórios, CPF válido e conferência entre documentos. Depois disso, o processo segue para **Em análise** e continua normalmente até Aprovado/Admitido.
5. Na ficha aparece um selo **"Admissão conduzida pelo RH"**, com data e nome de quem assumiu. Tudo fica no histórico.

Se o RH quiser devolver ao candidato depois, pode usar o card **"Link do candidato"** para gerar um novo link. Essa função já existe.

## Fora do escopo
- Não muda o link de análise de perfil.
- Não apaga nem refaz o OCR dos documentos antigos.

## Detalhes técnicos
- Nova ação de servidor `takeOverAdmission` (apenas RH): grava `token_revoked_at = now()`, guarda em `form_data.conduzido_por_rh` quem e quando, registra `advanceStage` e uma auditoria `hr_takeover`. É idempotente.
- `HrDocumentUpload`: na primeira importação, quando o link ainda está ativo, pede confirmação e chama `takeOverAdmission` antes.
- O portal `/c/$token` já bloqueia links com `token_revoked_at`. Vamos ajustar a mensagem para o caso de o RH ter assumido.
- Nova ação `submitApplicationByHr` (apenas RH): reaproveita os módulos de validação compartilhados (`candidateContactSchema`, documentos obrigatórios, `crossCheckCandidate`/`blockingIssues`). Assim, as regras do portal e do RH não ficam diferentes. Ela grava `form_data` e move o processo para `em_analise`.
- A ficha usa `updateCandidateForm` para salvar o que o RH preencher, com o painel de pendências calculado pelo mesmo validador.
- A regra correspondente será registrada em AGENTS.md, e haverá testes do validador do caminho RH.
