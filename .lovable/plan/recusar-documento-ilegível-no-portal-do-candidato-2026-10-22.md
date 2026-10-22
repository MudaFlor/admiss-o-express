# Recusar documento ilegível no portal do candidato

## O que muda para o candidato
Quando o candidato anexar um documento que deveria ter dados lidos (RG/CIN, CPF, CNH, comprovante de residência, título de eleitor, certidão, PIS, cartão SUS e documentos de dependentes com leitura) e a leitura não conseguir extrair nada, o arquivo é **recusado**:
- Aparece a mensagem: **"Imagem do documento está ilegível, por gentileza reenviar documento."**
- O documento não entra em "Documentos e OCR" do RH e o item continua pendente para novo envio.
- Um documento anterior válido do mesmo tipo não é apagado.

Documentos sem leitura de dados (currículo, CTPS, foto 3x4, reservista, escolaridade, cursos, vacinação) continuam sendo aceitos normalmente.

## Regra de recusa
Recusar quando a leitura retornar "falha" ou quando nenhum campo for extraído. Se a leitura der erro técnico (ex.: IA indisponível), não recusar o documento como ilegível: mostrar "Não foi possível analisar agora, tente novamente".

## Detalhes técnicos
- `src/lib/candidate-public.functions.ts` (`finalizeDocumentUpload`): após `runOcr`, se o tipo exige OCR e (`status === "falha"` ou `fields` vazio), apagar o arquivo enviado no storage, registrar auditoria e lançar o erro com a mensagem acima — antes de excluir o documento anterior e de inserir o novo.
- Exportar de `src/lib/ocr/provider.server.ts` um helper `typeRequiresOcr(type)`.
- `src/routes/c.$token.tsx`: o `toast.error` já exibe a mensagem; aumentar a duração do aviso para ficar bem visível.
- Teste unitário da regra de recusa (falha / sem campos / tipo sem OCR).
