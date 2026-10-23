import { FICHA_FIELDS, ORIGEM_LABEL } from "./ficha-consolidation";

export async function downloadFichaPdf(
  candidate: { full_name?: string | null; codigo?: number | null; position?: string | null },
  data: Record<string, string>,
  origem: Record<string, string>,
  raceLabel: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;
  doc.setFont("helvetica", "bold").setFontSize(15).text("Ficha Cadastral do Candidato", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`${candidate.codigo != null ? `#${candidate.codigo} · ` : ""}${candidate.position ?? ""}`, 15, y);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 195, y, { align: "right" });
  y += 3;
  doc.line(15, y, 195, y);
  y += 7;
  const rows: Array<[string, string, string]> = FICHA_FIELDS.map(([k, l]) => [l, data[k] || "—", ORIGEM_LABEL[origem[k]] ?? ""]);
  rows.push(["Raça/cor", raceLabel || "—", "Autodeclaração"]);
  rows.push(["Estado civil", data.estado_civil || "—", ""]);
  for (const [label, value, src] of rows) {
    doc.setFont("helvetica", "bold").setFontSize(9).text(label, 15, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 95);
    doc.text(lines, 65, y);
    doc.setFontSize(7).setTextColor(120).text(src, 195, y, { align: "right" });
    doc.setTextColor(0);
    y += Math.max(6.5, lines.length * 4.5);
    if (y > 270) { doc.addPage(); y = 18; }
  }
  y += 18;
  doc.line(15, y, 95, y);
  doc.line(115, y, 195, y);
  doc.setFontSize(8).text("Assinatura do candidato", 15, y + 4);
  doc.text("Recursos Humanos", 115, y + 4);
  const name = (candidate.full_name ?? "candidato").normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`Ficha-Cadastral-${name}.pdf`);
}
