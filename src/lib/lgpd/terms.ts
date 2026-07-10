export const LGPD_TERMS_VERSION = "v1.2026-07-10";

export const LGPD_TERMS_TEXT = `TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS — LGPD (Lei nº 13.709/2018)

Versão: ${LGPD_TERMS_VERSION}

1. Tratamento de dados pessoais. Autorizo, de forma livre, informada e inequívoca, a coleta, o armazenamento, o uso, o compartilhamento interno e o tratamento dos meus dados pessoais e dos documentos que envio nesta plataforma para as finalidades descritas neste termo.

2. Finalidades. Os dados serão utilizados exclusivamente para (i) processo de recrutamento e seleção; (ii) análise de perfil e conferência das informações; (iii) formalização de eventual contratação; (iv) cumprimento de obrigações legais e regulatórias aplicáveis.

3. Dados coletados. Dados de identificação (nome, CPF, RG, data de nascimento), contato (e-mail, telefone), endereço, escolaridade, dados profissionais e documentos correlatos (RG/CNH, CPF, CTPS, título de eleitor, comprovante de residência, escolaridade, certidões, dados de dependentes quando aplicável).

4. Compartilhamento. Os dados NÃO serão compartilhados com terceiros sem minha autorização prévia, exceto quando exigido por lei, ordem judicial ou autoridade competente.

5. Segurança. A empresa adota medidas técnicas e administrativas de segurança compatíveis com a natureza dos dados, incluindo controle de acesso restrito, transmissão criptografada (HTTPS) e armazenamento em ambiente protegido.

6. Retenção. Os dados serão mantidos pelo prazo necessário para as finalidades acima e, após esse período, serão eliminados ou anonimizados, salvo quando a legislação exigir prazo superior.

7. Direitos do titular (art. 18 da LGPD). Posso solicitar, a qualquer momento: confirmação da existência de tratamento, acesso aos dados, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamentos e revogação deste consentimento.

8. Assinatura eletrônica. Ao concluir esta etapa digitando meu nome completo e confirmando meu CPF, declaro expressamente meu aceite. Serão registrados, como prova do consentimento: data e hora do aceite (servidor), endereço IP, informações técnicas do meu dispositivo (navegador, sistema, fuso horário, idioma) e, se eu autorizar expressamente, a minha localização aproximada.

9. Revogação. Posso revogar este consentimento a qualquer momento, o que poderá inviabilizar minha participação no processo seletivo.
`;

export async function hashTerms(text: string, version: string): Promise<string> {
  const enc = new TextEncoder().encode(`${version}\n${text}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}