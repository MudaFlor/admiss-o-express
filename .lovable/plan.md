# Tema claro / tema escuro no menu do topo

Hoje o sistema é sempre escuro (paleta "Black Premium"). Vou adicionar uma escolha de tema
persistente para cada usuário, dentro do menu já existente na barra superior.

## O que o usuário vai ver

- No menu já existente do topo (botão da conta, com avatar e seta), acima de "Configurações",
  entra um submenu **Tema** com as opções **Claro**, **Escuro** e **Sistema** (segue a
  preferência do aparelho), com marcação na opção ativa.
- A escolha fica salva no navegador e é aplicada já no carregamento, sem piscar de tela.
- Sem botão novo na barra superior e sem nova aba em Configurações.

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
- `src/components/AppTopbar.tsx`: dentro do `DropdownMenu` existente, adicionar um
  `DropdownMenuSub` "Tema" com `DropdownMenuRadioGroup` (Claro / Escuro / Sistema) e ícones
  Sun, Moon e Monitor.

Sem alterações de banco de dados — a preferência é local ao navegador.
