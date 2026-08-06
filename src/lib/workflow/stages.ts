// Constantes de estágio seguras para o cliente (sem imports de servidor).
export const STAGE_ORDER = [
  "cadastro_iniciado",
  "aceite_lgpd",
  "curriculo_enviado",
  "documentos_enviados",
  "ocr_concluido",
  "em_analise",
  "pendencia_documental",
  "correcao_solicitada",
  "aguardando_aprovacao",
  "aprovado",
  "admitido",
] as const;

export type CandidateStage = (typeof STAGE_ORDER)[number];

export const STAGE_LABEL: Record<CandidateStage, string> = {
  cadastro_iniciado: "Cadastro iniciado",
  aceite_lgpd: "Aceite LGPD",
  curriculo_enviado: "Currículo enviado",
  documentos_enviados: "Documentos enviados",
  ocr_concluido: "OCR concluído",
  em_analise: "Em análise",
  pendencia_documental: "Pendência documental",
  correcao_solicitada: "Correção solicitada",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  admitido: "Admitido",
};
