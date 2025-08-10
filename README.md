# ∴ bit2

<div align="center">

<svg fill="none" height="256" viewBox="0 0 256 256" width="256" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><filter id="a" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" height="419" width="419" x="0" y="0"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dy="4"/><feGaussianBlur stdDeviation="2"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_17_16"/><feBlend in="SourceGraphic" in2="effect1_dropShadow_17_16" mode="normal" result="shape"/></filter><filter id="b" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" height="316" width="319" x="50" y="45"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset/><feGaussianBlur stdDeviation="27.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.92549 0 0 0 0 0.733333 0 0 0 0 0.270588 0 0 0 0.5 0"/><feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_17_16"/><feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset/><feGaussianBlur stdDeviation="27.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.831373 0 0 0 0 0.596078 0 0 0 0 0.258824 0 0 0 0.15 0"/><feBlend in2="effect1_dropShadow_17_16" mode="normal" result="effect2_dropShadow_17_16"/><feBlend in="SourceGraphic" in2="effect2_dropShadow_17_16" mode="normal" result="shape"/></filter><linearGradient id="c" gradientUnits="userSpaceOnUse" x1="386" x2="31.5" y1="25" y2="382"><stop offset="0" stop-color="#314466"/><stop offset=".594039" stop-color="#10142f"/><stop offset="1" stop-color="#060d15"/></linearGradient><linearGradient id="d"><stop offset="0" stop-color="#efbd41"/><stop offset="1" stop-color="#c08a6f"/></linearGradient><radialGradient id="e" cx="0" cy="0" gradientTransform="matrix(0 44.6887 -44.4713 0 209.5 126.811)" gradientUnits="userSpaceOnUse" r="1" xlink:href="#d"/><radialGradient id="f" cx="0" cy="0" gradientTransform="matrix(0 44.6888 -44.4713 0 287.319 279.189)" gradientUnits="userSpaceOnUse" r="1" xlink:href="#d"/><radialGradient id="g" cx="0" cy="0" gradientTransform="matrix(0 44.6888 -44.4713 0 131.681 279.189)" gradientUnits="userSpaceOnUse" r="1" xlink:href="#d"/><g filter="url(#a)"><rect fill="url(#c)" height="411" rx="96" width="411" x="4"/></g><g filter="url(#b)"><path d="m209.5 153.623c-14.675 0-26.681-12.066-26.681-26.812s12.006-26.811 26.681-26.811c14.674 0 26.681 12.065 26.681 26.811s-12.007 26.812-26.681 26.812z" fill="url(#e)"/><path d="m260.638 279.189c0 14.746 12.007 26.811 26.681 26.811s26.681-12.065 26.681-26.811-12.007-26.812-26.681-26.812-26.681 12.066-26.681 26.812z" fill="url(#f)"/><path d="m105 279.189c0 14.746 12.006 26.811 26.681 26.811 14.674 0 26.681-12.065 26.681-26.811s-12.007-26.812-26.681-26.812c-14.675 0-26.681 12.066-26.681 26.812z" fill="url(#g)"/></g></svg>

**A modern CLI tool for scaffolding Astro applications with libSQL/Turso database integration and flexible deployment options**

[![npm version](https://badge.fury.io/js/bit2-cli.svg)](https://www.npmjs.com/package/bit2-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#-quick-start) • [Commands](#-commands) • [Stack](#-tech-stack) • [Features](#-what-you-get)

</div>

## 🎯 What is bit2?

bit2 is the fastest way to create modern web applications with a complete, production-ready stack. Get a beautiful Astro site with database integration and your choice of deployment platform configured in minutes.

### ✨ Features

- 🚀 **Astro 5.x** - Modern web framework with SSR and islands architecture
- 💾 **libSQL/Turso** - SQLite for the edge with global replication
- 🎯 **Provider Choice** - Deploy to Cloudflare Pages, Vercel, or Netlify
- ⚡ **Bun Runtime** - Fast JavaScript runtime and package manager
- 🏛️ **Stoic Wisdom** - Educational content with philosophical quotes
- 📱 **Responsive Design** - Mobile-first with professional dark theme
- 🔄 **Auto Setup** - Database initialization and dependency installation
- 🛠️ **Smart Adapters** - Automatic adapter installation for your chosen provider

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

### Core Commands

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

### `bit2 deploy`
**Smart deployment workflow:**
- **First deployment**: Full setup (database, adapter, git repo)
- **Subsequent deployments**: Checks for uncommitted changes, then pushes
- Creates Turso cloud database automatically
- Interactive provider selection (Cloudflare Pages, Vercel, Netlify)
- Installs correct adapter automatically
- Optionally creates GitHub/GitLab repository

### Productivity Commands

### `bit2 db [action]`
**Database management made easy:**
- `bit2 db` or `bit2 db info` - Complete database overview
- `bit2 db shell` - Interactive SQL shell
- `bit2 db token` - Generate production credentials
- `bit2 db create` - Create new Turso database

### `bit2 open`
**Instant dashboard access:**
- Opens deployment dashboard in your browser
- Works with Cloudflare Pages, Vercel, Netlify
- Smart URL generation based on your provider

### `bit2 logs`
**Deployment log viewing:**
- Shows recent deployment logs
- Provider-specific log commands
- Fallback to dashboard links when CLI tools unavailable

### `bit2 status`
**Complete project overview:**
- Validates project structure and dependencies
- Shows database, repository, and deployment status
- Displays dashboard URLs and creation dates
- Provides next step recommendations

### Utility Commands

### `bit2 migrate`
Runs database migrations:
- Applies schema changes
- Runs seed data
- Works with both local and production databases

### `bit2 delete [project-name]`
**Completely remove project and all cloud resources:**
- Deletes Turso database (all data permanently lost)
- Removes GitHub repository (all code history permanently lost)
- Deletes Cloudflare Pages project (site goes offline)
- Removes local project files

**Usage:**
```bash
# From inside project directory
bit2 delete

# From parent directory
bit2 delete my-project

# Skip confirmation
bit2 delete my-project --force
```

**Options:**
- `--force` - Skip confirmation prompt (use with caution!)

⚠️ **This action cannot be undone!** Use with extreme caution.

### `bit2 test`
Runs comprehensive integration tests:
- Tests project creation
- Validates database setup
- Checks build process
- Tests API endpoints

## 🎯 Common Workflows

### First Time Setup
```bash
bit2 new my-app          # Create new project
cd my-app
bit2 dev                 # Start development
# Make changes...
bit2 deploy              # Full deployment setup
```

### Daily Development
```bash
bit2 dev                 # Start dev server
# Make changes...
git add .
git commit -m "Updates"
bit2 deploy              # Smart push (checks for uncommitted changes)
```

### Database Management
```bash
bit2 db info             # Check database status
bit2 db shell            # Interactive SQL
bit2 db token            # Get production credentials
bit2 status              # Full project overview
```

### Deployment Operations
```bash
bit2 open                # Open dashboard
bit2 logs                # Check deployment logs
bit2 status              # Project overview
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

### Smart Deployment Setup

Deploy to your preferred platform with guided setup:

```bash
bit2 deploy
```

This will:
1. ✅ Create and configure your Turso cloud database
2. ✅ Let you choose: Cloudflare Pages, Vercel, or Netlify
3. ✅ Install the correct adapter automatically
4. ✅ Optionally create Git repository (GitHub/GitLab)
5. ✅ Provide detailed deployment instructions
6. ✅ Save configuration for easy management

**Manage your deployment:**
```bash  
bit2 status              # Complete project overview
bit2 open                # Open dashboard
bit2 logs                # Check deployment logs
bit2 db token            # Get production credentials
```

### Build Settings (Auto-configured)
- **Framework preset**: Astro (auto-detected)
- **Build command**: `bun run build`  
- **Build output directory**: `dist`
- **Auto-deploy**: Every push to main branch (optional)

## 🛠️ Prerequisites

### For Development
- **Bun** (recommended) or Node.js 18+

### For Deployment
- **Turso CLI** for database management (required)
- **GitHub/GitLab CLI** for repository creation (optional)
- Account with your chosen provider (Cloudflare/Vercel/Netlify)

### Install & Setup
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Turso CLI (required for deployment)
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup

# Optional: Install Git CLI tools for automatic repo creation
brew install gh    # GitHub CLI
brew install glab  # GitLab CLI
gh auth login      # If using GitHub
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
