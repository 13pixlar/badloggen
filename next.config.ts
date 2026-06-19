/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "better-sqlite3"],
};

export default nextConfig;
