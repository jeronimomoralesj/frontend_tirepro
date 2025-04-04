import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images:{
    domains: ["tirepro.com.co", "tireproimages.s3.us-east-1.amazonaws.com"]
  },
  typescript: {
    ignoreBuildErrors: true, 
  },
};

export default nextConfig;
