/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@krouzky/domain'],
  webpack: (config) => {
    // Doména používá ESM importy s příponou `.js` (správné pro tsc);
    // webpack je musí umět rozřešit na zdrojové `.ts`.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
