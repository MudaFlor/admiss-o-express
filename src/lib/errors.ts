// Nunca devolver mensagens cruas do banco/serviços ao navegador:
// elas expõem nomes de colunas, constraints e detalhes de políticas.
// Logamos o detalhe no servidor e lançamos uma mensagem genérica ao cliente.

export function fail(detail: unknown, publicMessage = "Não foi possível concluir a operação. Tente novamente."): never {
  console.error("[app-error]", detail);
  throw new Error(publicMessage);
}
