# Remover o perfil "Gestor" da tela de login

## O que muda
Na tela de login, o seletor "Acessar como" passa a ter apenas dois perfis:

- **RH** — gestão completa
- **Candidato/Colaborador** — meus dados

O botão "Gestor" é removido e os dois botões restantes passam a ocupar a largura em duas colunas.

## Detalhes técnicos
- `src/routes/login.tsx`: remover o item `gestor` da lista `profiles`, renomear o item `colab` para "Candidato/Colaborador", e trocar o grid de `grid-cols-3` para `grid-cols-2`.
- O perfil é apenas visual (não altera autenticação nem rotas), e não é usado em nenhum outro arquivo — nenhuma mudança de backend é necessária.
