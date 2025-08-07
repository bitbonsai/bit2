# bit2 🚀

<div align="center">

![bit2 logo](https://bitbons.ai/bit-logo.svg)

**A modern CLI tool for scaffolding Astro applications with libSQL/Turso database integration**

[![npm version](https://badge.fury.io/js/bit2-cli.svg)](https://www.npmjs.com/package/bit2-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#-quick-start) • [Commands](#-commands) • [Stack](#-tech-stack) • [Features](#-what-you-get)

</div>

## 🎯 What is bit2?

bit2 is the fastest way to create modern web applications with a complete, production-ready stack. Get a beautiful Astro site with database integration and cloud deployment configured in seconds.

### ✨ Features

- 🚀 **Astro 5.x** - Modern web framework with islands architecture
- 💾 **libSQL/Turso** - SQLite for the edge with global replication
- ☁️ **Cloudflare Pages** - Fast, secure, and free hosting with SSR
- ⚡ **Bun Runtime** - Fast JavaScript runtime and package manager
- 🎨 **Beautiful Design** - Professional dark theme with golden accents
- 🧪 **Built-in Testing** - Comprehensive integration tests
- 📱 **Responsive** - Mobile-first design that works everywhere
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
```

That's it! Your app is running with a database, API endpoints, and a beautiful UI.

## 📋 Commands

### `bit2 new <project-name>`
Creates a new Astro project with everything configured:
- Copies optimized Astro template
- Installs dependencies automatically
- Sets up local SQLite database
- Seeds with sample data
- Ready to run immediately

### `bit2 dev`
Starts the development server:
- Uses local SQLite database (`./dev.db`)
- Hot reload with Astro
- Fast refresh with Bun

### `bit2 migrate`
Runs database migrations:
- Applies schema changes
- Runs seed data
- Works with both local and production databases

### `bit2 deploy`
Sets up production deployment:
- Creates Turso cloud database
- Sets up GitHub repository
- Provides Cloudflare Pages setup instructions

### `bit2 test`
Runs comprehensive integration tests:
- Tests project creation
- Validates database setup
- Checks build process
- Tests API endpoints

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
├── astro.config.mjs     # Astro + Cloudflare configuration
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

Deploys to **Cloudflare Pages** with automatic Git integration:

1. Run `bit2 deploy` to set up GitHub repo and Turso database
2. Follow the provided instructions to configure Cloudflare Pages
3. Auto-deploys on every push to main branch

### Build Settings
- **Framework preset**: Astro
- **Build command**: `bun run build`
- **Build output directory**: `dist`

### Environment Variables
```
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token
```

## 🛠️ Prerequisites

- **Bun** (recommended) or Node.js 18+
- **Turso CLI** for database management
- **GitHub CLI** for repository creation
- **Cloudflare account** for deployment

Install prerequisites:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Turso CLI
brew install tursodatabase/tap/turso

# Install GitHub CLI
brew install gh

# Authenticate
turso auth signup
gh auth login
```

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Turso Documentation](https://docs.turso.tech)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)

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
- [Cloudflare](https://cloudflare.com) for global edge infrastructure
- [Bun](https://bun.sh) for the fast runtime

---

<div align="center">

**Made with ❤️ for the modern web**

[⭐ Star on GitHub](https://github.com/bitbons-ai/bit2) • [📦 View on npm](https://www.npmjs.com/package/bit2-cli) • [🐛 Report Issues](https://github.com/bitbons-ai/bit2/issues)

</div>