# Concluir segurança, automações e facilidades operacionais

> Atualização: os uploads passarão a aceitar **apenas PDF, JPEG e PNG**. DOCX, WEBP, HEIC/HEIF e demais formatos serão removidos das regras client-side e server-side.


## Objetivo
Finalizar os blocos anteriormente solicitados, mantendo fora do escopo apenas o isolamento entre empresas. A entrega reforçará o portal do candidato, o controle de acesso por link, os arquivos, a retenção LGPD, a auditoria e os testes dos fluxos críticos.

## Estado confirmado
- O banco já possui campos para cancelar, renovar e registrar lembretes do link do candidato, mas eles ainda não são usados pelas telas ou funções.
- O limitador persistente já existe e é usado no comprovante LGPD; o portal do candidato ainda usa somente a camada em memória.
- As regras compartilhadas de arquivo e a inspeção após upload já existem, porém ainda não estão ligadas ao envio do candidato.
- O utilitário de links de documentos com duração de 5 minutos existe, mas as consultas do RH e do candidato ainda geram links de 10 minutos diretamente.
- As rotas protegidas para descarte de documentos e exclusão LGPD após 30 dias já existem.
- A auditoria registra ações importantes, mas ainda não cobre renovação/cancelamento de link, lembretes e visualização de documentos.

## Implementação

### 1. Proteger o portal público
- Substituir o limitador apenas local pelo limitador persistente nas operações de leitura, gravação, upload e assinatura LGPD.
- Aplicar limites também às ações ainda descobertas: dependentes, exclusão de documento, análise de currículo, envio final e solicitação de exclusão.
- Validar em toda abertura ou mutação que o link não foi cancelado e ainda está dentro do prazo.
- Retornar mensagens seguras e compreensíveis para link expirado, cancelado ou excesso de tentativas.

### 2. Gerenciar o link do candidato pelo RH
- Criar ações autenticadas para renovar e cancelar o acesso.
- Ao renovar, gerar um token novo, definir nova validade, invalidar imediatamente o anterior e registrar a data da renovação.
- Ao cancelar, bloquear imediatamente todas as leituras e alterações feitas pelo link atual.
- Exibir no detalhe do candidato o estado do link, a validade e botões com confirmação para renovar ou cancelar.
- Disponibilizar novamente o atalho de WhatsApp com o link válido após a renovação.
- Registrar as duas operações na auditoria.

### 3. Validar uploads de ponta a ponta
- Restringir a lista de formatos permitidos a **PDF, JPEG e PNG** nas regras compartilhadas (`src/lib/upload-rules.ts`) e em todos os campos de arquivo do sistema.
- Validar no navegador tamanho máximo de 10 MB, extensão e tipo antes do envio do currículo, documentos do titular e documentos de dependentes.
- Restringir o pedido de upload a extensões permitidas e garantir que o caminho gerado pertença ao candidato e ao tipo informado.
- Após o upload, conferir no servidor tamanho e tipo registrados; remover automaticamente arquivos inválidos antes de OCR ou gravação no banco.
- Rejeitar caminhos adulterados e impedir que um candidato finalize arquivos de outra pasta.
- Manter mensagens claras para formato inválido, arquivo vazio ou tamanho excedido.


### 4. Reduzir exposição dos documentos
- Centralizar a criação de links temporários no utilitário existente de 5 minutos.
- Aplicar essa duração no portal do candidato, no detalhe do RH e na lixeira.
- Registrar na auditoria a abertura de documentos pelo RH por meio de uma ação segura que gere o link sob demanda, evitando tratar o carregamento automático de miniaturas como download manual.

### 5. Lembretes e acompanhamento prático
- Adicionar no detalhe do candidato o botão de lembrete por WhatsApp em um clique, com mensagem pronta, prazo do link e acesso ao portal.
- Atualizar `last_reminder_at` somente quando o RH confirmar a abertura do WhatsApp e registrar o evento no histórico/auditoria.
- Mostrar quando o último lembrete foi preparado, evitando cobranças duplicadas sem contexto.
- Preservar o fluxo já existente de correções específicas por checklist.

### 6. Retenção LGPD e histórico
- Manter a lixeira de arquivos por 30 dias e a exclusão solicitada pelo candidato após 30 dias.
- Tornar o processamento idempotente, registrar quantidade de itens removidos e auditar falhas sem expor dados pessoais.
- Revisar dependências entre candidato, documentos, dependentes, notificações, correções e histórico para que a exclusão não deixe dados órfãos nem falhe no meio.
- Preservar o comprovante legal anonimizado conforme a regra atual.

### 7. Resolver alertas remanescentes do banco
- Executar a verificação atual antes das mudanças e corrigir somente alertas de segurança compatíveis com este escopo.
- Restringir execução de funções privilegiadas aos papéis estritamente necessários.
- Confirmar permissões, políticas e acesso ao bucket privado sem abrir leitura anônima.
- Não alterar a arquitetura de empresas nem adicionar isolamento multiempresa.

### 8. Testes e validação final
- Adicionar testes focados em arquivo válido/inválido, link ativo/expirado/cancelado/renovado e limites de tentativas.
- Testar o ciclo completo: criação pelo RH, envio por WhatsApp, aceite LGPD, currículo, documentos, envio final, correção e reenvio.
- Testar no navegador as telas do RH e do candidato, incluindo estados de erro e confirmações.
- Verificar metadados de todas as páginas alteradas e corrigir somente o necessário para manter títulos e descrições próprios.
- Executar a verificação de segurança final e documentar qualquer limitação que dependa de serviço externo.

## Critérios de aceite
- Um link cancelado ou antigo deixa de funcionar imediatamente; apenas o token renovado funciona.
- Abuso distribuído do portal é contido pelo contador persistente.
- Nenhum arquivo acima de 10 MB ou com tipo não permitido chega ao OCR ou ao cadastro.
- Links de documentos expiram em 5 minutos.
- O RH consegue renovar, cancelar e reenviar o acesso por WhatsApp, com histórico das ações.
- As rotinas de retenção removem dados no prazo previsto sem expor informações ou deixar referências quebradas.
- Os fluxos críticos passam nos testes automatizados e na validação real do navegador.

## Fora do escopo
- Isolamento de dados entre empresas, conforme solicitado.
- Integração paga de envio automático de WhatsApp ou e-mail; o aviso continuará em um clique pelo WhatsApp do RH.
