# ∴ bit2

<div align="center">

<img src="https://raw.githubusercontent.com/bitbonsai/bit2/main/bitlogo.png" alt="bit2 logo">

**A modern CLI tool for scaffolding Astro applications with libSQL/Turso database integration and Vercel deployment**

[![npm version](https://badge.fury.io/js/bit2-cli.svg)](https://www.npmjs.com/package/bit2-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#-quick-start) • [Commands](#-commands) • [Features](#-features)

</div>

## 🎯 What is bit2?

bit2 is the fastest way to create modern web applications with a complete, production-ready stack. Get a beautiful Astro site with database integration and Vercel deployment configured in minutes.

## ✨ Features

- 🚀 **Astro 5.x** - Modern web framework with SSR and islands architecture
- 💾 **libSQL/Turso** - SQLite for the edge with global replication
- 🎯 **Multi Deploy** - One-command deployment to Cloudflare, Vercel or Netlify
- ⚡ **Bun Runtime** - Fast JavaScript runtime and package manager
- 🔄 **Auto Setup** - Database initialization and dependency installation

## 🚀 Quick Start

```bash
# Install globally
npm install -g bit2-cli

# Create a new project
bit2 new my-awesome-app

# Start developing
cd my-awesome-app
bit2 dev

# Deploy to production (when ready)
bit2 deploy
```

That's it! Your app is running with a database, API endpoints, and a beautiful UI. When ready, deploy to production with a single command!

## 📋 Commands

### `bit2 new <project-name>`
Creates a new Astro project with everything configured:
- Copies optimized Astro template
- Installs dependencies automatically
- Sets up local SQLite database with sample data
- Ready to run immediately

### `bit2 dev`
Starts the development server with local SQLite database and hot reload

### `bit2 deploy`
Smart deployment workflow:
- Creates Turso cloud database automatically
- Sets up GitHub repository (optional)
- Deploys to Cloudflare, Vercel or Netlify with automatic configuration
- Configures environment variables

### `bit2 migrate`
Runs database migrations for both local and production databases

## 🎯 Workflow

```bash
# Create new project
bit2 new my-app
cd my-app

# Start development  
bit2 dev

# Deploy to production
bit2 deploy
```

## 📁 Project Structure

```
my-app/
├── src/
│   ├── pages/           # Astro pages (frontend + API)
│   ├── components/      # Astro components
│   ├── db/
│   │   ├── client.ts    # Database client configuration
│   │   ├── schema.sql   # Database schema
│   │   └── seed.sql     # Sample data
│   └── lib/
│       └── db.ts        # Database utilities
├── dev.db               # Local SQLite database
├── astro.config.mjs     # Astro + Cloudflare, Vercel or Netlify configuration
└── package.json
```

## 🗄️ Database

### Local Development
- Uses SQLite database file: `./dev.db`
- Automatically created on first migration
- Perfect for development and testing

### Production
- Uses [Turso](https://turso.tech/) cloud database
- Global edge replication
- Seamless scaling
- Configured via environment variables

## 🚀 Deployment

The `bit2 deploy` command handles everything:

1. Creates and configures your Turso cloud database
2. Sets up GitHub repository
3. Installs Cloudflare, Vercel or Netlify adapter  
4. Shows instructions for Cloudflare, Vercel or Netlify deplyoy  configuration
5. Next deployments on git push

## 🛠️ Prerequisites

### For Development
- **Bun** (recommended) or Node.js 18+

### For Deployment  
- **Turso CLI** for database management
- **GitHub CLI** for auto repository creation
- Accounts with Turso, GitHub, and Cloudflare, Vercel or Netlify

### Install & Setup
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Turso CLI (required for deployment)
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup

# Install CLI tools for deployment
brew install gh          # GitHub CLI  
gh auth login
```

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Turso Documentation](https://docs.turso.tech)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bit2 test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Astro](https://astro.build) for the amazing web framework
- [Turso](https://turso.tech) for edge SQLite
- [Bun](https://bun.sh) for the fast runtime

---

<div align="center">

**Made with ❤️ for the modern web**

[⭐ Star on GitHub](https://github.com/bitbons-ai/bit2) • [📦 View on npm](https://www.npmjs.com/package/bit2-cli) • [🐛 Report Issues](https://github.com/bitbons-ai/bit2/issues)

</div>
