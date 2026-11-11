# Análise de perfil com duas perguntas abertas

## O que muda para o candidato/colaborador
- O link enviado pelo WhatsApp (botão atual de análise de perfil) passa a mostrar **apenas as duas perguntas** informadas, com caixa de texto para cada uma, ambas obrigatórias (mínimo de algumas frases).
- Após enviar, a pessoa vê apenas uma mensagem de agradecimento — ela não vê a análise.
- Link continua válido por 15 dias e aceita uma única resposta.

## O que o RH recebe na ficha (candidato e colaborador)
Gerado automaticamente por IA, agindo como psicólogo organizacional sênior, com base nas duas respostas:
1. Estilo de Liderança e Tomada de Decisão
2. Hierarquia de Valores e Critérios de Confiança
3. Flexibilidade Cognitiva e Resiliência
4. Nível de Autoconsciência
5. Resumo executivo: pontos fortes e pontos de atenção (gargalos)

Também ficam visíveis as respostas originais, a data de resposta e um botão para gerar a análise novamente caso a IA falhe. Resultados DISC antigos continuam no histórico, marcados como "DISC (modelo anterior)", sem serem apagados.

## Detalhes técnicos
- Reaproveitar a tabela `disc_assessments`: novo campo `kind` ('disc' | 'perfil_aberto', padrão 'disc' para os existentes) e `analysis jsonb`; respostas ficam em `answers` como `{ q1, q2 }`.
- `src/routes/disc.$token.tsx`: renderiza o formulário de duas perguntas quando `kind = 'perfil_aberto'`; novos links criados sempre com esse tipo.
- Server function pública de envio valida texto (zod, 30–5000 caracteres), salva e dispara análise via Lovable AI Gateway (`openai/gpt-6-astra`, Responses, saída em JSON estruturado com os 4 eixos + pontos fortes/atenção). Falha da IA não perde as respostas; RH pode reprocessar (função restrita ao RH).
- `DiscCard.tsx`: renomear para "Análise de perfil" e exibir os blocos da análise.
- Testes para validação das respostas e para o formato da análise.
