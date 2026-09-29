import "server-only";

// Na Vercel, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AWS_REGION podem ser
// da própria plataforma (ela roda na AWS). Por isso o app lê nomes próprios
// (DEOLHO_AWS_*) e passa as credenciais explicitamente; sem eles, cai na
// cadeia padrão do SDK (perfil local, variáveis AWS_*).
export const awsRegion = process.env.DEOLHO_AWS_REGION ?? process.env.AWS_REGION ?? "us-east-1";

export function awsCredentials() {
  const accessKeyId = process.env.DEOLHO_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DEOLHO_AWS_SECRET_ACCESS_KEY;
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}
