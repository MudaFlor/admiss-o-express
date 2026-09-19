# Teste ponta a ponta: cadastro, documentos, correção e WhatsApp

Objetivo: validar, em um fluxo real no navegador, todo o caminho do candidato e do RH — desde a criação do link até o aviso de correção.

Observação: este teste cria dados reais no banco (um candidato de teste e arquivos enviados). Ao final, esses dados são removidos, a menos que você prefira mantê-los para conferir na tela.

## Roteiro do teste

1. **Criar o candidato (lado RH)**
   - Entrar na área do RH, criar um candidato de teste ("Candidato Teste QA") e copiar o link público gerado.
   - Conferir o cartão do link: status ativo, data de validade, botões de renovar, cancelar e lembrete.

2. **Cadastro completo (portal público)**
   - Abrir o link do candidato.
   - Aceitar o termo LGPD com assinatura (nome e CPF idênticos ao cadastro) e confirmar o registro.
   - Preencher a ficha (dados pessoais, endereço, dados complementares).
   - Enviar documentos: um arquivo PDF e um arquivo JPG gerados para o teste, cobrindo pelo menos dois tipos obrigatórios.
   - Confirmar que os arquivos aparecem na lista com miniatura/link e que um arquivo de formato não aceito é recusado com a mensagem correta.
   - Finalizar o envio e verificar a mensagem de conclusão.

3. **Solicitar correção (lado RH)**
   - Abrir o candidato no painel, marcar campos e documentos pendentes no checklist de correção e salvar.
   - Conferir o texto pronto para WhatsApp e o link montado (número, mensagem e endereço do portal).

4. **Conferir o banner (portal público)**
   - Reabrir o link do candidato e confirmar que o aviso de pendência aparece no topo com os itens marcados.
   - Reenviar um documento e finalizar novamente; confirmar que a pendência é encerrada e o banner some.

5. **Limpeza**
   - Remover o candidato de teste e os arquivos enviados, salvo instrução em contrário.

## Entrega

Relatório com o que funcionou, capturas de tela de cada etapa (aceite, envio de documentos, banner de correção, mensagem do WhatsApp) e a lista de falhas encontradas com a correção proposta para cada uma.

## Detalhes técnicos

- Execução via Playwright contra o servidor local (`http://localhost:8080`), sessão do RH restaurada a partir da sessão disponível no ambiente.
- Arquivos de teste gerados em `/tmp` (um PDF simples e um JPG), enviados pelos seletores de arquivo do portal.
- Verificação do link do WhatsApp lida pelo atributo `href`/URL gerada, sem abrir o WhatsApp de fato.
- Conferência complementar no banco (candidato, documentos, `correction_requests`, `candidate_stage_history`) para confirmar que os estágios avançaram como esperado.
- Correções de código encontradas durante o teste serão listadas no relatório; se você quiser que eu já aplique as correções simples no mesmo passo, me avise.
