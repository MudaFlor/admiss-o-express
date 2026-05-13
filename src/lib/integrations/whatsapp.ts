// Helper isomórfico para gerar links wa.me. Quando a WhatsApp Cloud API for adicionada,
// expor um sendMessage(server) aqui sem mudar o callsite do botão de compartilhar.

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  if (cleaned) return `https://wa.me/${cleaned}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

export function buildCandidateInviteMessage(opts: {
  candidateName: string;
  link: string;
  companyName?: string | null;
}) {
  const company = opts.companyName ? ` na ${opts.companyName}` : "";
  return `Olá ${opts.candidateName}! 👋\n\nPara concluir sua admissão${company}, envie seus documentos pelo link abaixo. Leva poucos minutos:\n\n${opts.link}\n\nDúvidas? É só responder esta mensagem.`;
}