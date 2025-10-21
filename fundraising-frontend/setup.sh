#!/bin/bash
# ============================================
# COMPLETE NEXT.JS SETUP FOR FHEVM FUNDRAISING
# Run this inside the fundraising-frontend directory
# ============================================

set -e
echo "🚀 Setting up Next.js FHEVM Fundraising dApp..."

# ============================================
# STEP 1: Install Dependencies
# ============================================

echo "📦 Installing dependencies..."
npm install fhevmjs@0.5.2 @privy-io/react-auth@1.83.0 viem@2.21.4

echo "✅ Dependencies installed!"

# ============================================
# STEP 2: Create Environment File
# ============================================

echo "🔐 Creating .env.local..."
cat > .env.local << 'EOF'
NEXT_PUBLIC_PRIVY_APP_ID=cmh017ptg06aala0bjy02gk67
NEXT_PUBLIC_CONTRACT_ADDRESS=0x40f55006d0cF9664D99ce1f699A32dbD26F97d0B
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_GATEWAY_URL=https://gateway.sepolia.zama.ai
NEXT_PUBLIC_ACL_ADDRESS=0x2Fb4341027eb1d2aD8B5D9708187df8633cAFA92
EOF

echo "✅ Environment file created!"

# ============================================
# STEP 3: Create Directory Structure
# ============================================

echo "📁 Creating directory structure..."
mkdir -p lib/{fhevm,contracts}
mkdir -p components/{layout,campaign,wallet}
mkdir -p contexts
mkdir -p hooks
mkdir -p types

echo "✅ Directories created!"

# ============================================
# STEP 4: Update next.config.js
# ============================================

echo "⚙️ Configuring Next.js..."
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
EOF

echo "✅ Next.js configured!"

# ============================================
# STEP 5: Update Tailwind Config
# ============================================

echo "🎨 Updating Tailwind config..."
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
};
export default config;
EOF

echo "✅ Tailwind configured!"

# ============================================
# STEP 6: Update Global CSS
# ============================================

echo "🎨 Updating global styles..."
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
EOF

echo "✅ Global styles updated!"

# ============================================
# STEP 7: Create .gitignore additions
# ============================================

echo "📝 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Environment variables
.env.local
.env

# IDE
.vscode
.idea
EOF

echo "✅ .gitignore updated!"

# ============================================
# SUMMARY
# ============================================

echo ""
echo "======================================"
echo "✨ Setup Complete!"
echo "======================================"
echo ""
echo "📦 Installed:"
echo "   - fhevmjs@0.5.2"
echo "   - @privy-io/react-auth@1.83.0"
echo "   - viem@2.21.4"
echo ""
echo "📁 Created structure:"
echo "   - lib/fhevm/"
echo "   - lib/contracts/"
echo "   - components/layout/"
echo "   - components/campaign/"
echo "   - components/wallet/"
echo "   - contexts/"
echo "   - hooks/"
echo "   - types/"
echo ""
echo "⚙️ Configured:"
echo "   - next.config.mjs (webpack fallbacks)"
echo "   - tailwind.config.ts (custom colors)"
echo "   - .env.local (environment variables)"
echo ""
echo "🎯 NEXT STEPS:"
echo "======================================"
echo "1. I'll provide all the source files"
echo "2. Copy them into the correct directories"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"
echo ""
echo "✅ Ready for source code!"
echo "======================================"