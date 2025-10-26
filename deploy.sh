#!/bin/bash

# ============================================
# CONFIDENTIAL FUNDRAISING - FULL DEPLOYMENT SCRIPT
# Deploy contracts and set up frontend in one command
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default network
NETWORK="${1:-sepolia}"

echo ""
echo "=========================================="
echo "🚀 CONFIDENTIAL FUNDRAISING DEPLOYMENT"
echo "=========================================="
echo "Network: $NETWORK"
echo "=========================================="
echo ""

# ============================================
# STEP 1: Clean previous build
# ============================================
echo -e "${BLUE}📦 [1/5] Cleaning previous build...${NC}"
npm run clean 2>/dev/null || echo "No previous build to clean"
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# ============================================
# STEP 2: Compile contracts
# ============================================
echo -e "${BLUE}🔨 [2/5] Compiling contracts...${NC}"
npm run compile
echo -e "${GREEN}✅ Compilation complete${NC}"
echo ""

# ============================================
# STEP 3: Generate TypeScript types
# ============================================
echo -e "${BLUE}📝 [3/5] Generating TypeScript types...${NC}"
echo "TypeScript types generated automatically during compilation"
echo -e "${GREEN}✅ Types generated${NC}"
echo ""

# ============================================
# STEP 4: Deploy contracts
# ============================================
echo -e "${BLUE}🚀 [4/5] Deploying contracts to $NETWORK...${NC}"
npx hardhat deploy --network "$NETWORK"
echo -e "${GREEN}✅ Deployment complete${NC}"
echo ""

# ============================================
# STEP 5: Copy artifacts to frontend
# ============================================
echo -e "${BLUE}📋 [5/5] Setting up frontend integration...${NC}"

# Copy TypeScript types to frontend
if [ -d "types" ]; then
  echo "Copying TypeScript contract types to frontend..."
  mkdir -p fundraising-frontend/src/types/contracts
  cp -r types/* fundraising-frontend/src/types/contracts/ 2>/dev/null || echo "Note: Some type files may not exist yet"
  echo -e "${GREEN}✅ Types copied to frontend${NC}"
fi

echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "📋 What was done:"
echo "  ✓ Contracts compiled"
echo "  ✓ TypeScript types generated"
echo "  ✓ ShareVault deployed"
echo "  ✓ ConfidentialFundraising deployed"
echo "  ✓ Contracts linked and configured"
echo "  ✓ Frontend .env.local updated"
echo "  ✓ Contract ABIs copied to frontend"
echo ""
echo "📝 Next steps:"
echo "  1. Review deployment summary above"
echo "  2. Start the frontend:"
echo "     cd fundraising-frontend && npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
echo "=========================================="
echo ""

# ============================================
# Show deployment info if it exists
# ============================================
if [ -f "fundraising-frontend/src/contracts/deployment.json" ]; then
  echo "📄 Deployment Details:"
  cat fundraising-frontend/src/contracts/deployment.json
  echo ""
fi

echo -e "${GREEN}✅ All done! Happy fundraising! 🎉${NC}"
echo ""
