import { describe, expect, it } from "vitest";
import {
  buildDependentRecord,
  DEPENDENT_CERTIFICATE_FIELDS,
  DEPENDENT_NAME_PLACEHOLDER,
  dependentOcrPatch,
  formatDependentCpf,
  normalizeDependentName,
} from "./dependent-record";

const dep = { id: "child-1", full_name: "Dependente", birth_date: "2019-03-20", cpf: "12345678901", relationship: "filho" };
const certificate = { id: "doc-1", type: "dependente_certidao", dependent_id: dep.id, storage_path: "certidao.pdf", ocr_data: { values: { numero_nativivo: "0012345", matricula: "000123456789", livro: "A-12", pagina: "34" } } };

describe("ficha de dependentes", () => {
  it("exibe CPF com os pontos solicitados", () => {
    expect(formatDependentCpf("12345678901")).toBe("123.456.789-01");
  });
  it("mantém nascimento como data de calendário", () => {
    expect(buildDependentRecord(dep, []).birthDate).toBe("20/03/2019");
  });
  it("extrai número do nativivo e matrícula separadamente, preservando zeros", () => {
    const ficha = buildDependentRecord(dep, [certificate]);
    expect(ficha.liveBirthNumber).toBe("0012345");
    expect(ficha.registration).toBe("000123456789");
  });
  it("exibe livro e página quando existentes na certidão", () => {
    const ficha = buildDependentRecord(dep, [certificate]);
    expect(ficha.book).toBe("A-12");
    expect(ficha.page).toBe("34");
  });
  it("não inventa número do nativivo a partir da matrícula", () => {
    expect(buildDependentRecord(dep, [{ ...certificate, ocr_data: { values: { matricula: "000123" } } }]).liveBirthNumber).toBe("—");
  });
  it("associa somente documentos do dependente correto", () => {
    expect(buildDependentRecord(dep, [certificate, { ...certificate, id: "other", dependent_id: "child-2" }]).documents.map(doc => doc.id)).toEqual(["doc-1"]);
  });
  it("usa CPF extraído do documento de identidade quando não foi digitado", () => {
    const ficha = buildDependentRecord({ ...dep, cpf: null }, [{ ...certificate, type: "dependente_rg_cpf", ocr_data: { values: { cpf: "12345678901" } } }]);
    expect(ficha.cpf).toBe("123.456.789-01");
  });
  it("prioriza correções revisadas sem alterar a extração original", () => {
    const ficha = buildDependentRecord(dep, [certificate], { documentos_revisados: { "doc-1": { numero_nativivo: "0098765" } } });
    expect(ficha.liveBirthNumber).toBe("0098765");
    expect(certificate.ocr_data.values.numero_nativivo).toBe("0012345");
  });
  it("solicita ao OCR todos os campos da certidão requeridos", () => {
    for (const field of ["nome", "data_nascimento", "cpf", "numero_nativivo", "matricula", "livro", "pagina"]) expect(DEPENDENT_CERTIFICATE_FIELDS).toContain(field);
  });
  it("salva nomes em maiúsculas e sem acentos", () => {
    expect(normalizeDependentName("  João   da Conceição ")).toBe("JOAO DA CONCEICAO");
    expect(buildDependentRecord({ ...dep, full_name: "José María" }, []).fullName).toBe("JOSE MARIA");
  });
  it("preenche os campos vazios com os dados lidos dos documentos", () => {
    expect(dependentOcrPatch(
      { full_name: DEPENDENT_NAME_PLACEHOLDER, birth_date: null, cpf: null, rg: null },
      { nome: "Ana Júlia", data_nascimento: "20/03/2019", cpf: "123.456.789-01", rg: "12.345.678-9" },
    )).toEqual({ full_name: "ANA JULIA", birth_date: "2019-03-20", cpf: "12345678901", rg: "12.345.678-9" });
  });
  it("não sobrescreve dados já revisados pelo candidato", () => {
    expect(dependentOcrPatch(
      { full_name: "NOME REVISADO", birth_date: "2000-01-02", cpf: "12345678901", rg: "RG-1" },
      { nome: "OUTRO NOME", data_nascimento: "03/04/2005", cpf: "98765432100", rg: "RG-2" },
    )).toEqual({});
  });
});
import { formatCivilRegistration as fcr } from "./dependent-record";
describe("formatCivilRegistration", () => {
  it("formata 32 dígitos no padrão da matrícula", () => {
    expect(fcr("12345601552015100123045000123412")).toBe("123456.01.55.2015.1.00123.045.0001234.12");
    expect(fcr("123456 01 55 2015 1 00123 045 0001234-12")).toBe("123456.01.55.2015.1.00123.045.0001234.12");
  });
  it("mantém valores incompletos como estão", () => {
    expect(fcr("12345")).toBe("12345");
  });
});
