#!/bin/bash

# Oracle Arena Production Deployment Script
# This script deploys the Oracle Arena to production

set -e

echo "🚀 Oracle Arena Production Deployment"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.production exists
if [ ! -f "env.production" ]; then
    echo "❌ Error: env.production not found. Please create it first."
    exit 1
fi

# Load production environment variables
echo "📋 Loading production environment variables..."
source env.production

# Validate required environment variables
required_vars=(
    "NEXT_PUBLIC_SUPRA_RPC_URL"
    "NEXT_PUBLIC_SUPRA_CHAIN_ID"
    "NEXT_PUBLIC_ORACLE_ARENA_CONTRACT"
    "NEXT_PUBLIC_VRF_CONTRACT"
    "NEXT_PUBLIC_BRIDGE_CONTRACT"
    "SUPRA_ORACLE_API_KEY"
    "NEXT_PUBLIC_ORACLE_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"YOUR_"* ]]; then
        echo "❌ Error: $var is not properly configured in env.production"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Choose deployment method
echo ""
echo "🌐 Choose deployment method:"
echo "1) Vercel (recommended for production)"
echo "2) Docker (for self-hosted deployment)"
echo "3) Traditional server deployment"
echo "4) Exit"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Deploying to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "📥 Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Deploy to Vercel
        vercel --prod --confirm
        echo "✅ Deployment to Vercel completed!"
        ;;
        
    2)
        echo "🐳 Deploying with Docker..."
        
        # Check if Docker is running
        if ! docker info &> /dev/null; then
            echo "❌ Error: Docker is not running"
            exit 1
        fi
        
        # Build and start containers
        docker-compose up -d --build
        
        echo "✅ Docker deployment completed!"
        echo "🌐 Application is running at http://localhost:3000"
        echo "📊 Monitor with: docker-compose logs -f oracle-arena"
        ;;
        
    3)
        echo "🖥️  Traditional server deployment..."
        
        # Create production directory
        sudo mkdir -p /var/www/oracle-arena
        sudo cp -r dist/* /var/www/oracle-arena/
        sudo cp server.js /var/www/oracle-arena/
        sudo cp package.json /var/www/oracle-arena/
        
        # Set permissions
        sudo chown -R www-data:www-data /var/www/oracle-arena
        sudo chmod -R 755 /var/www/oracle-arena
        
        # Install PM2 if not present
        if ! command -v pm2 &> /dev/null; then
            echo "📥 Installing PM2..."
            npm install -g pm2
        fi
        
        # Start application with PM2
        cd /var/www/oracle-arena
        pm2 start server.js --name "oracle-arena" --env production
        pm2 save
        pm2 startup
        
        echo "✅ Traditional deployment completed!"
        echo "🌐 Application is running with PM2"
        echo "📊 Monitor with: pm2 monit"
        ;;
        
    4)
        echo "👋 Deployment cancelled"
        exit 0
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Oracle Arena Production Deployment Complete!"
echo ""
echo "🔗 Next steps:"
echo "1) Update your DNS to point to the deployed application"
echo "2) Configure SSL certificates if needed"
echo "3) Set up monitoring and logging"
echo "4) Test all wallet connections and smart contract interactions"
echo "5) Monitor the application for any issues"
echo ""
echo "📚 Documentation: https://docs.oracle-arena.supra.com"
echo "🐛 Support: https://github.com/your-org/oracle-arena/issues"
