import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, 
  },
  images:{
    domains: ["tirepro.com.co", "tireproimages.s3.us-east-1.amazonaws.com"]
  },
};

export default nextConfig;
