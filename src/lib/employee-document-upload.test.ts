import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = {
    validate: (input: unknown): unknown => input,
    run: async (_input: unknown): Promise<unknown> => undefined,
    middleware: () => builder,
    inputValidator: (fn: (input: unknown) => unknown) => { builder.validate = fn; return builder; },
    handler: (fn: (input: unknown) => Promise<unknown>) => { builder.run = fn; return builder; },
  };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { createEmployeeDocumentUploadUrl, finalizeEmployeeDocumentUpload } from "./employee-document-upload.functions";

type Action = { validate: (input: unknown) => unknown; run: (input: unknown) => Promise<unknown> };
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const create = createEmployeeDocumentUploadUrl as unknown as Action;
const finalize = finalizeEmployeeDocumentUpload as unknown as Action;

describe("documentos posteriores do colaborador", () => {
  it("exige RH tanto para preparar quanto para concluir o upload", async () => {
    for (const action of [create, finalize]) {
      const from = vi.fn();
      await expect(action.run({ data: { employee_id: id }, context: {
        userId: id, supabase: { rpc: vi.fn().mockResolvedValue({ data: false }), from },
      } })).rejects.toThrow("Apenas RH");
      expect(from).not.toHaveBeenCalled();
    }
  });
  it("impede associar um arquivo à pasta de outro colaborador ou candidato", () => {
    const data = { employee_id: id, label: "Atestado", storage_path: `employees/${id}/${other}.pdf` };
    expect(finalize.validate(data)).toEqual(data);
    expect(() => finalize.validate({ ...data, storage_path: `employees/${other}/${other}.pdf` })).toThrow();
    expect(() => finalize.validate({ ...data, storage_path: `${id}/${other}.pdf` })).toThrow();
    expect(() => finalize.validate({ ...data, storage_path: `employees/${id}/../${other}.pdf` })).toThrow();
  });
});