# Changelog

All notable changes to bit2 will be documented in this file.

## [1.0.0] - 2025-01-20

### 🎯 Developer Experience Enhancements

### Added
- **New `bit2 db` command** - Complete database management
  - `bit2 db info` - Show database overview and connection details
  - `bit2 db shell` - Interactive SQL shell
  - `bit2 db token` - Generate production auth tokens anytime
  - `bit2 db create` - Create new Turso databases
- **New `bit2 open` command** - Instantly open deployment dashboards in browser
- **New `bit2 logs` command** - View recent deployment logs with provider-specific commands
- **Enhanced `bit2 status`** - Now shows dashboard URLs, creation dates, last deploy info
- **Smart subsequent deployments** - `bit2 deploy` now detects existing deployments and provides cleaner workflow

### Changed
- **Improved deployment workflow**: First deploy does full setup, subsequent deploys check for uncommitted changes then push
- **Better database architecture**: Removed problematic default export, fixed environment variable handling
- **Cleaner CLI output**: Removed unnecessary validation messages for subsequent deployments
- **Updated documentation**: Comprehensive README with new command workflows and examples

### Fixed
- **Database client errors**: Fixed build-time environment variable access issues
- **Delete command improvements**: Added proper Cloudflare fallback, removed duplicate GitHub links
- **Template cleanup**: Removed unnecessary git remote checks from index page (eliminated Vite warnings)
- **All database functions**: Now consistently use explicit runtime parameter pattern

### Removed
- **Live URL guessing**: Status command no longer attempts unreliable deployment URL prediction
- **Wrangler deletion attempts**: Deploy delete now uses manual instructions for all providers

## [0.9.0] - 2025-08-09 (Previous Release)

### 🚀 Breaking Changes
- `bit2 deploy` now performs **fully automated deployment** by default
  - Creates Cloudflare Pages project automatically
  - Sets up GitHub integration
  - Configures environment variables
  - No manual dashboard steps required
- Old manual behavior moved to `bit2 deploy --local`

### ✨ New Features
- **Automated Cloudflare Pages deployment** with wrangler integration
- **Interactive account selection** for multiple Cloudflare accounts
- **`bit2 delete` command** for complete project and infrastructure removal
- **`bit2 status` command** for checking deployment and infrastructure status
- **Progress indicators with timers** using ora spinners
- **Version tracking** in generated projects
- **CLAUDE.md** file in template for better AI assistant integration

### 🎨 UI/UX Improvements
- Yellow `∴` symbol branding throughout CLI
- Cleaned up visual hierarchy with bold colored text
- Improved error messages with recovery steps

### 🔧 Technical Improvements
- Updated to wrangler v4.28.1 for latest Cloudflare features
- Enhanced error handling for permission issues
- Better handling of multi-statement SQL files
- Improved Git repository detection and setup

## [0.8.0] - Initial Release
- Basic scaffolding for Astro + libSQL projects
- Manual deployment workflow
- Database migration support
- Development server integration