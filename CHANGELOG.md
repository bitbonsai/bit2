# Changelog

All notable changes to bit2 will be documented in this file.

## [2.0.0] - 2025-08-09

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
  - Removes Turso database
  - Deletes GitHub repository
  - Removes Cloudflare Pages project
  - Cleans up local files
- **`bit2 status` command** for checking deployment and infrastructure status
- **Progress indicators with timers** using ora spinners
- **Version tracking** in generated projects
- **CLAUDE.md** file in template for better AI assistant integration
- **Deployment flags**:
  - `--dry-run` to preview deployment plan
  - `--local` for manual deployment with instructions

### 🎨 UI/UX Improvements
- Yellow `∴` symbol branding throughout CLI
- Cleaned up visual hierarchy with bold colored text
- Removed background boxes for cleaner output
- Made bit2 commands bold in help text
- Added elapsed time to all long-running operations
- Improved error messages with recovery steps

### 🔧 Technical Improvements
- Updated to wrangler v4.28.1 for latest Cloudflare features
- Enhanced error handling for permission issues
- Better handling of multi-statement SQL files
- Improved Git repository detection and setup
- Added .gitignore to template projects

### 🐛 Bug Fixes
- Fixed status command creating resources instead of just checking
- Fixed delete command not properly removing local files
- Fixed database initialization with comments in SQL files
- Fixed multiple Cloudflare accounts handling

## [1.0.0] - Initial Release
- Basic scaffolding for Astro + libSQL projects
- Manual deployment workflow
- Database migration support
- Development server integration