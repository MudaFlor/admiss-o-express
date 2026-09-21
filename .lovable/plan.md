# Retomar o teste ponta a ponta

Continuar do ponto em que parou: o candidato de teste já foi criado pelo RH e o link do portal foi gerado. Falta percorrer o portal público, pedir correção e conferir o aviso ao candidato.

## Etapas do teste

1. **Criar candidato de teste**
   Novo candidato pelo RH (nome "Candidato Teste QA", CPF válido de teste), copiar o link do portal e a mensagem de WhatsApp.

2. **Cadastro completo no portal público**
   - Aceite do termo LGPD com assinatura (nome e CPF iguais ao cadastro); conferir gravação de data/hora, dispositivo e versão do termo.
   - Preencher a ficha (dados pessoais, contato, sexo, estado civil, cor/raça).
   - Enviar um arquivo em formato inválido (.txt) e confirmar a recusa com a mensagem "Formato não aceito. Envie apenas PDF, JPG ou PNG."
   - Enviar os documentos obrigatórios em PDF e JPG, conferindo miniatura/visualização e o checklist zerando as pendências.
   - Finalizar o envio e confirmar a tela de conclusão.

3. **Solicitação de correção pelo RH**
   - Abrir o candidato no painel do RH, confirmar que os dados chegaram consolidados.
   - Abrir o pedido de correção marcando um campo e um documento, com observação.
   - Conferir o texto e o link da mensagem de WhatsApp gerada.

4. **Aviso ao candidato e reenvio**
   - Reabrir o portal com o mesmo link e conferir o banner amarelo com a lista de itens a corrigir.
   - Reenviar o documento pedido e finalizar de novo.
   - Confirmar que a pendência é encerrada e o candidato volta para análise no painel do RH.

5. **Limpeza**
   Remover candidato de teste, documentos, dependentes, consentimentos e pedidos de correção criados durante o teste.

## Entrega

Relatório em português com captura de cada etapa, o que funcionou, as falhas encontradas e a correção proposta para cada uma. Falhas simples e diretamente ligadas ao fluxo testado serão corrigidas na hora; qualquer mudança maior será apresentada antes.

## Detalhes técnicos

- Playwright em `http://localhost:8080`, scripts em `/tmp/browser/qa/`, arquivos de apoio `doc.pdf`, `doc.jpg`, `bad.txt`.
- Sessão do RH via `lovable auth-session --json --self` (usuário dp@mudaflor.com.br, papéis rh + admin).
- Limpeza por consulta direta ao banco pelas chaves do candidato de teste.
