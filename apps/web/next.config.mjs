/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ask4moreish/shared"],
  webpack: (config) => {
    // @ask4moreish/shared uses NodeNext-style ".js" specifiers that point at
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


