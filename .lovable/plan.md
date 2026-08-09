# Tema claro / tema escuro em Configurações

Hoje o sistema é sempre escuro (paleta "Black Premium"). Vou adicionar uma escolha de tema
persistente para cada usuário, com uma nova aba em **Configurações → Aparência**.

## O que o usuário vai ver

- Nova aba **Aparência** em `/configuracoes` com três opções: **Claro**, **Escuro** e **Sistema**
  (segue a preferência do aparelho), exibidas como cartões selecionáveis com prévia de cores.
- Um botão rápido de sol/lua no topo (ao lado do sino) para alternar sem entrar nas configurações.
- A escolha fica salva no navegador e é aplicada já no carregamento, sem piscar de tela.

## Design do tema claro

O tema escuro atual permanece exatamente igual (padrão). O tema claro reaproveita a mesma
identidade Mudaflor: fundo branco levemente quente, cartões brancos com bordas suaves,
texto grafite, verde-limão como cor primária (com contraste ajustado para fundo claro) e
rosa-magenta como acento. Sidebar clara com contraste sutil, sombras mais leves.

## Detalhes técnicos

- `src/styles.css`: mover a paleta escura atual para `.dark` (substituindo o bloco genérico
  slate que está lá hoje) e definir a nova paleta clara em `:root`, mantendo os mesmos nomes
  de tokens, incluindo sidebar, `--shadow-*` e `--gradient-*`. Nenhum componente muda de classe.
- Novo `src/components/theme-provider.tsx`: contexto com `theme` (`light` | `dark` | `system`),
  persistência em `localStorage` (`mudaflor-theme`), aplicação da classe `dark` no `<html>`,
  e escuta de `prefers-color-scheme` no modo sistema.
- `src/routes/__root.tsx`: envolver a aplicação no provider e injetar um script inline no
  `<head>` que aplica a classe antes da hidratação (evita flash e mismatch de SSR).
- `src/components/AppTopbar.tsx`: botão de alternância com ícones Sun/Moon.
- `src/routes/_authenticated/configuracoes.tsx`: aba "Aparência" com os três cartões de escolha.

Sem alterações de banco de dados — a preferência é local ao navegador.
