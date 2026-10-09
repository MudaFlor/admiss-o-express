// Gera o comprovante de aceite LGPD como arquivo PDF real, no navegador do RH.
type Consent = {
  id: string;
  accepted_at: string;
  terms_version?: string | null;
  terms_hash?: string | null;
  terms_text?: string | null;
  signature_name?: string | null;
  signature_cpf?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: unknown;
  revoked_at?: string | null;
};

export async function downloadConsentPdf(c: Consent, candidate: { full_name?: string | null; cpf?: string | null; email?: string | null }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const dev = (c.device_info ?? {}) as Record<string, unknown>;
  const W = 180;
  let y = 18;
  const line = (label: string, value: unknown) => {
    doc.setFont("helvetica", "bold").setFontSize(9).text(label, 15, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value ?? "—") || "—", W - 50);
    doc.text(lines, 65, y);
    y += Math.max(6, lines.length * 4.5);
    if (y > 280) { doc.addPage(); y = 18; }
  };
  const section = (t: string) => {
    y += 3;
    doc.setFont("helvetica", "bold").setFontSize(11).text(t, 15, y);
    doc.line(15, y + 1.5, 195, y + 1.5);
    y += 8;
  };

  doc.setFont("helvetica", "bold").setFontSize(15).text("Comprovante de Aceite — Termo LGPD", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(9).text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 15, y);
  y += 5;
  doc.setFont("helvetica", "bold").text(c.revoked_at ? "REVOGADO" : "ASSINADO DIGITALMENTE", 15, y);
  y += 4;

  section("Signatário");
  line("Nome cadastrado", candidate.full_name);
  line("CPF cadastrado", candidate.cpf);
  line("Nome assinado", c.signature_name);
  line("CPF confirmado", c.signature_cpf);
  line("E-mail", candidate.email);

  section("Momento do aceite");
  line("Data e hora", new Date(c.accepted_at).toLocaleString("pt-BR"));
  line("Endereço IP", c.ip_address);
  line("Fuso horário", dev.timezone);
  line("Idioma", dev.language);

  section("Aparelho utilizado");
  line("Tipo", dev.device_type);
  line("Plataforma", dev.platform);
  line("User-Agent", c.user_agent);

  section("Integridade do termo");
  line("Versão", c.terms_version);
  line("Hash SHA-256", c.terms_hash);
  if (c.revoked_at) line("Revogado em", new Date(c.revoked_at).toLocaleString("pt-BR"));

  section("Texto integral do termo aceito");
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  for (const l of doc.splitTextToSize(c.terms_text ?? "—", W)) {
    if (y > 285) { doc.addPage(); y = 18; }
    doc.text(l, 15, y);
    y += 4;
  }

  const name = (candidate.full_name ?? "candidato").normalize("NFD").replace(/[^\w]+/g, "-");
  doc.save(`Comprovante-LGPD-${name}.pdf`);
}
