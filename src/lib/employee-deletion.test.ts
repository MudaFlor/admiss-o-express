import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validate: (input: unknown): unknown => input,
      run: async (_input: unknown): Promise<unknown> => undefined,
      middleware: () => builder,
      inputValidator: (fn: (input: unknown) => unknown) => { builder.validate = fn; return builder; },
      handler: (fn: (input: unknown) => Promise<unknown>) => { builder.run = fn; return builder; },
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/audit.server", () => ({ logAudit: vi.fn() }));
import { deleteEmployee } from "./management.functions";

const action = deleteEmployee as unknown as {
  validate: (input: unknown) => unknown;
  run: (input: unknown) => Promise<unknown>;
};
const id = "00000000-0000-4000-8000-000000000001";

describe("exclusão de colaborador", () => {
  it("exige confirmação Sim antes de excluir", () => {
    expect(() => action.validate({ id, confirmed: false })).toThrow();
    expect(() => action.validate({ id })).toThrow();
    expect(action.validate({ id, confirmed: true })).toEqual({ id, confirmed: true });
  });
  it("impede exclusão sem permissão administrativa", async () => {
    const from = vi.fn();
    await expect(action.run({ data: { id, confirmed: true }, context: {
      userId: id, supabase: { rpc: vi.fn().mockResolvedValue({ data: false }), from },
    } })).rejects.toThrow("Somente administradores");
    expect(from).not.toHaveBeenCalled();
  });
  it("exclui somente o colaborador selecionado sem remover candidato ou arquivos", async () => {
    const eq = vi.fn();
    const query = { delete: vi.fn(), eq, select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id }, error: null }) };
    query.delete.mockReturnValue(query); eq.mockReturnValue(query); query.select.mockReturnValue(query);
    const from = vi.fn().mockReturnValue(query);
    expect(await action.run({ data: { id, confirmed: true }, context: {
      userId: id, supabase: { rpc: vi.fn().mockResolvedValue({ data: true }), from },
    } })).toEqual({ ok: true });
    expect(from.mock.calls).toEqual([["employees"]]);
    expect(eq).toHaveBeenCalledWith("id", id);
  });
});