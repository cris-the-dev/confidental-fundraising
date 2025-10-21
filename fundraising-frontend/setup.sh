#!/bin/bash
set -e
echo "🚀 Setting up Confidential Fundraising Frontend..."

# Create package.json
cat > package.json << 'PACKAGE'
{
  "name": "fundraising-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "fhevmjs": "^0.5.2",
    "@privy-io/react-auth": "^1.83.0",
    "viem": "^2.21.4",
    "@tanstack/react-query": "^5.59.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "tailwindcss": "^3.4.10",
    "postcss": "^8.4.41",
    "autoprefixer": "^10.4.20"
  }
}
PACKAGE

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🎨 Initializing Tailwind..."
npx tailwindcss init -p

# Create directory structure
mkdir -p src/{components/{layout,campaign,wallet},contexts,hooks,lib/{fhevm,contracts},types}

# Create basic files
cat > index.html << 'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confidential Fundraising</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
HTML

cat > .env.local << 'ENV'
VITE_PRIVY_APP_ID=
VITE_CONTRACT_ADDRESS=
VITE_CHAIN_ID=11155111
VITE_RPC_URL=
VITE_GATEWAY_URL=https://gateway.sepolia.zama.ai
VITE_ACL_ADDRESS=0x2Fb4341027eb1d2aD8B5D9708187df8633cAFA92
ENV

cat > src/index.css << 'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
CSS

echo "✅ Setup complete! Now add your source files."
