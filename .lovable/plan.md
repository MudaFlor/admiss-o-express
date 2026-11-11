# Análise de perfil com duas perguntas abertas

## O que muda para o candidato/colaborador
- O link enviado pelo WhatsApp pelo botão atual de análise de perfil passa a mostrar **apenas as duas perguntas** informadas. Cada uma tem uma caixa de texto, e as duas são obrigatórias.
- Depois de enviar, a pessoa vê só uma mensagem de agradecimento. Ela não vê a análise.
- O link continua válido por 15 dias e aceita uma única resposta.

## O que o RH recebe na ficha do candidato e do colaborador
A análise é gerada automaticamente pela IA, que age como psicólogo organizacional sênior, com base nas duas respostas:
1. Estilo de Liderança e Tomada de Decisão
2. Hierarquia de Valores e Critérios de Confiança
3. Flexibilidade Cognitiva e Resiliência
4. Nível de Autoconsciência
5. Resumo executivo, com pontos fortes e pontos de atenção (gargalos)

O RH também vê as respostas originais e a data da resposta. Há um botão para gerar a análise de novo caso a IA falhe. Os resultados DISC antigos continuam no histórico, marcados como "DISC (modelo anterior)", e nada é apagado.

## Revisão do perfil ao longo do tempo
Na psicologia organizacional, o perfil não é fixo: ele muda com a experiência, o cargo e o momento de vida. Por isso:
- **Reaplicação periódica**: o RH pode enviar um novo link quando quiser. O sistema sugere reavaliar a cada 12 meses ou em momentos importantes, como fim da experiência, promoção ou troca de função.
- **Perguntas novas a cada ciclo**: repetir as mesmas perguntas gera respostas decoradas. Cada reavaliação usa um par diferente de perguntas, mas analisa os mesmos 4 eixos, para que os resultados possam ser comparados.
- **Linha do tempo**: todas as análises ficam salvas na ficha, em ordem de data. Nenhuma é substituída.
- **Comparação de evolução**: a partir da segunda análise, a IA escreve um parecer de evolução com o que se manteve, o que amadureceu e os novos pontos de atenção.
- **Contexto do RH**: antes de enviar o link, o RH pode anotar o motivo da reavaliação, como promoção ou feedback. Esse motivo é usado na análise.
- **Uso ético**: a análise serve para apoiar o desenvolvimento e nunca decide sozinha uma contratação ou um desligamento. Esse aviso aparece em todos os relatórios.

## Detalhes técnicos
- Reaproveitar `disc_assessments` com novos campos: `kind` ('disc' | 'perfil_aberto'), `analysis jsonb`, `evolution jsonb`, `question_set` e `cycle_reason`. As respostas ficam em `answers`.
- `src/routes/disc.$token.tsx` renderiza o formulário aberto. O banco de pares de perguntas fica em um módulo próprio, e o primeiro par é o que a usuária informou.
- O envio público é validado com zod (30–5000 caracteres por resposta), as respostas são salvas e a análise é gerada pelo Lovable AI Gateway (`openai/gpt-6-astra`, Responses, JSON estruturado). Se a IA falhar, as respostas não se perdem, e o RH pode reprocessar por uma função restrita ao RH. O parecer de evolução recebe a análise anterior como entrada.
- `DiscCard.tsx` passa a se chamar "Análise de perfil" e mostra a linha do tempo.
- Testes para a validação das respostas, para a escolha do par de perguntas e para o formato da análise.
