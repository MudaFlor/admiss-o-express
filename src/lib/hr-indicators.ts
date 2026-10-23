// Indicadores do RH no cadastro do candidato (campos editáveis e filtráveis).
export const HR_SELECT_OPTIONS = {
  situacao_entrevista: [
    "Agendamento pendente",
    "Agendada",
    "Realizada",
    "Aprovado",
    "Reprovado",
    "Cancelada",
    "Não compareceu",
  ],
  teste: ["Pendente", "Aprovado", "Reprovado", "Não aplicável"],
  admitido: ["Sim", "Não", "Em processo", "Banco de talentos"],
  categoria: ["CLT", "PJ", "Estágio", "Aprendiz", "Temporário"],
  integracao: ["Agendada", "Realizada", "Pendente", "Não aplicável"],
  meio_recebimento: [
    "Indicação de colaborador",
    "LinkedIn",
    "Site / Trabalhe conosco",
    "WhatsApp",
    "E-mail",
    "Portal de vagas",
    "Presencial",
    "Redes sociais",
    "Outro",
  ],
  recontratar: ["Sim", "Não", "Avaliar"],
} as const;

export const HR_TEXT_FIELDS = ["cidade", "departamento", "recrutador"] as const;
export const HR_LONG_FIELDS = ["observacoes_entrevista", "observacoes_rh"] as const;

export type HrField =
  | (typeof HR_TEXT_FIELDS)[number]
  | (typeof HR_LONG_FIELDS)[number]
  | keyof typeof HR_SELECT_OPTIONS
  | "data_entrevista"
  | "indicacao_colaborador";

export const HR_FIELDS: HrField[] = [
  "cidade",
  "departamento",
  "recrutador",
  "data_entrevista",
  "situacao_entrevista",
  "observacoes_entrevista",
  "teste",
  "admitido",
  "categoria",
  "integracao",
  "observacoes_rh",
  "meio_recebimento",
  "indicacao_colaborador",
  "recontratar",
];

export const HR_LABELS: Record<HrField, string> = {
  cidade: "Cidade",
  departamento: "Departamento",
  recrutador: "Recrutador",
  data_entrevista: "Data da entrevista",
  situacao_entrevista: "Situação da entrevista",
  observacoes_entrevista: "Observações da entrevista",
  teste: "Teste",
  admitido: "Admitido",
  categoria: "Categoria",
  integracao: "Integração",
  observacoes_rh: "Observações",
  meio_recebimento: "Meio de recebimento do currículo",
  indicacao_colaborador: "Colaborador que indicou (nome completo)",
  recontratar: "Recontratar",
};

export const isReferral = (meio?: string | null) => (meio ?? "").toLowerCase().startsWith("indica");
