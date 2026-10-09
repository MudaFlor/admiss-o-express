// Links enviados ao candidato sempre usam o endereço público publicado,
// mesmo quando o RH gera o link pela visualização privada.
export const PUBLIC_APP_URL = "https://docu-hire-buddy.lovable.app";

export function candidatePortalUrl(token: string): string {
  return `${PUBLIC_APP_URL}/c/${token}`;
}
