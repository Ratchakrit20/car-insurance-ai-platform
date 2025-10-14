import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ❌ ไม่หยุด build ถึงแม้มี ESLint error
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: "preset-default",
                  params: {
                    overrides: {
                      removeViewBox: false,
                      cleanupIds: false,
                    },
                  },
                },
                {
                  name: "removeAttrs",
                  params: { attrs: "(data-name)" },
                },
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
