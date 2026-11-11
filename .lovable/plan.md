# Análise de perfil: Comunicação, Colaboração e Conflito

## O que muda para o candidato (link)
1. **Boas-vindas**: página branca, minimalista, no padrão do portal. Campos **Nome** e **Cargo/Área** (pré-preenchidos quando já conhecidos, editáveis) e botão destacado **Iniciar Análise**.
2. **Jornada passo a passo**: uma pergunta por vez, barra de progresso "1 de 2", campo de texto longo, botões Voltar/Próxima.
   - Pergunta 1 (Comunicação e Colaboração) e Pergunta 2 (Conflito e Colaboração) com o texto exato enviado.
   - Na 2ª pergunta aparece **Enviar respostas**. Depois, tela de agradecimento. Tudo sem recarregar a página.
3. As respostas ficam salvas; o candidato não vê o resultado.

## O que muda para o RH (ficha do candidato/colaborador)
- Após a resposta, aparece o botão **Gerar Perfil Comportamental** (a IA roda só quando o RH clicar; pode gerar novamente se falhar).
- **Painel de resultado** em cards:
  1. Estilo de Comunicação Corporativa — badge (Assertivo verde; Passivo / Agressivo / Passivo-Agressivo em tons discretos).
  2. Dinâmica de Colaboração e Interdependência.
  3. Resolução de Conflitos — badge da estratégia (Ganha-Ganha / Ganha-Perde / Evasão) e indicação se separa problema técnico das relações.
  4. Inteligência Emocional sob Pressão.
  5. Veredito Final — badge **Perfil Pontes** (verde) ou **Perfil Muros** (cinza), 1 Ponto Forte e 1 Ponto de Desenvolvimento.
- Botões **Exportar em PDF** e **Copiar Resultado**.
- Análises antigas (modelo anterior de 4 eixos e DISC) continuam visíveis no histórico, sem alteração.

## Decisões assumidas
- As duas perguntas passam a ser fixas em todas as reavaliações (sem rotação), para comparar a evolução.
- A IA usa exatamente as instruções de sistema enviadas, sem viés de liderança.

## Detalhes técnicos
- `src/lib/profile/questions.ts`: novo conjunto `ccc-1` com as 2 perguntas; novo schema `ProfileAnalysisV2` (`comunicacao {estilo enum, explicacao}`, `colaboracao`, `conflitos {estrategia enum, separa_tecnico_pessoal bool, explicacao}`, `inteligencia_emocional`, `veredito {perfil enum Pontes|Muros, ponto_forte, ponto_desenvolvimento}`) com `version: 2`. Testes atualizados.
- `analysis.server.ts`: novo `analyzeProfileV2` com o prompt de sistema literal, saída estruturada strict via Responses (modelo atual mantido).
- `disc.functions.ts`: `submitProfileAnswers` aceita `nome` e `cargo` (guardados em `answers`) e deixa de rodar a IA automaticamente (`analysis_status: "pendente"`); `regenerateProfileAnalysis` vira o "Gerar Perfil Comportamental" (já restrito ao RH e auditado). Parecer de evolução só entre análises v2.
- `src/routes/disc.$token.tsx`: fluxo em etapas (boas-vindas → P1 → P2 → concluído) com estado local.
- Novo `ProfileResultDashboard.tsx` usado no `DiscCard.tsx`; renderização v1 mantida para registros antigos. PDF via impressão de área dedicada (padrão já usado na ficha) e cópia em texto via clipboard.
- Sem mudança de banco (usa colunas JSON existentes). Atualizar memória `profile-analysis` e regra em `AGENTS.md`.

## Nova aba no menu: Análise de Perfil
- Item **Análise de Perfil** na barra lateral, com todos os perfis de candidatos e colaboradores numa só página.
- Lista com nome, tipo (Candidato/Colaborador), cargo, data da resposta, situação (aguardando resposta / aguardando geração / gerado) e badges do resultado (Pontes/Muros, estilo de comunicação).
- Busca por nome e filtros por tipo, situação e perfil.
- Clicar abre o painel de resultado na própria página (Gerar, Exportar PDF, Copiar), sem entrar no cadastro; link opcional para a ficha.
- Acesso: equipe de RH. O perfil Gestor foi removido do login antes; trazê-lo de volta seria um ajuste separado.
- Técnico: rota `src/routes/_authenticated/analise-perfil.tsx`, item no `AppSidebar.tsx`, server function `listProfileAnalyses` (autenticada, só RH) juntando nomes de candidatos/colaboradores.
