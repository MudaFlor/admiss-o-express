# Análise de Perfil: estilos comportamentais e temperamentos

## O que muda para o RH
O resultado gerado pela IA passa a ter dois cards novos, depois dos 5 blocos atuais (Comunicação, Colaboração, Conflitos, Inteligência Emocional e Veredito Pontes/Muros, que continuam iguais):

1. **Estilo comportamental:** porcentagem estimada de cada estilo (Dominante, Influente, Analítico, Planejador), com barras e o **estilo principal** e o **secundário** em destaque. Cada estilo vem com uma explicação curta baseada em trechos das respostas.
2. **Temperamento predominante:** Sanguíneo, Colérico, Fleumático ou Melancólico, com um temperamento secundário (se houver), o nível de confiança (baixa/média/alta) e a justificativa.

Também ficam:
- Um aviso discreto: com apenas duas respostas abertas, estilo e temperamento são **indicações**, não um diagnóstico psicológico.
- O mesmo conteúdo no Copiar e no PDF.
- Um filtro por estilo principal na aba Análise de Perfil.

## Regras de análise (papel de psicólogo especialista)
- A IA só pode tirar conclusões a partir do que a pessoa escreveu e precisa citar o comportamento observado.
- Quando houver pouca informação, a confiança cai para "baixa" e a IA não inventa traços.
- Correspondência usada como referência: Dominante ↔ Colérico, Influente ↔ Sanguíneo, Planejador (estável) ↔ Fleumático, Analítico ↔ Melancólico. Pode haver divergência se as respostas indicarem.

## Análises já existentes
As análises que já foram geradas continuam como estão. Para ver os novos cards, o RH clica em **Gerar novamente** (as respostas são mantidas; nada é perdido).

## Detalhes técnicos
- `src/lib/profile/questions.ts`: campos novos opcionais no schema v2 (`estilos: {dominante, influente, analitico, planejador: 0-100, principal, secundario, explicacao}`, `temperamento: {predominante, secundario?, confianca, justificativa}`); resultados antigos continuam válidos. Atualizar `analysisV2ToText`.
- `src/lib/profile/analysis.server.ts`: instrução e JSON schema da IA com os blocos 6 e 7; normalizar porcentagens para somar 100.
- Renderização em `DiscCard.tsx` / `analise-perfil.tsx` (barras + badges discretos), e filtro por estilo.
- Testes em `questions.test.ts`: enum de temperamento aceito, porcentagens 0-100, resultado antigo sem os blocos continua válido.
- Atualizar memória da análise de perfil.
