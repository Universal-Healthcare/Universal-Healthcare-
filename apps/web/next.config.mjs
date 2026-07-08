/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@universal-healthcare/shared"],
  webpack: (config) => {
    // @universal-healthcare/shared uses NodeNext-style ".js" specifiers that point at
    // ".ts" source files; teach webpack to resolve those for the workspace
    // package since it isn't pre-compiled to dist.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    }
    return config
  },
}

export default nextConfig


