export interface LibsqlConfig {
  url: string;
  authToken?: string;
}

export function getLibsqlConfig(): LibsqlConfig {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { url: "" };
  }

  const authToken = process.env.DATABASE_AUTH_TOKEN;
  return authToken ? { url, authToken } : { url };
}

export function isRemoteDatabase(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("https://");
}
