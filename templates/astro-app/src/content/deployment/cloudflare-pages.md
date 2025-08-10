---
title: Deploy to Cloudflare Pages
provider: Cloudflare Pages
buildCommand: bun run build
outputDir: dist
envVars: [TURSO_DATABASE_URL, TURSO_AUTH_TOKEN]
---

# Deploy to Cloudflare Pages

Cloudflare Pages provides fast, secure hosting with global CDN and automatic HTTPS.

## Prerequisites

- Cloudflare account (free at [cloudflare.com](https://cloudflare.com))
- Git repository (GitHub, GitLab, or Bitbucket)
- Turso database credentials (created by `bit2 deploy`)

## Step 1: Push to Git Repository

If you don't have a Git remote yet:

1. Create a repository on [GitHub](https://github.com/new), [GitLab](https://gitlab.com/projects/new), or [Bitbucket](https://bitbucket.org/repo/create)
2. Push your code:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## Step 2: Go to Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on **Developer Platform** tab
3. Click on **Pages** 
4. Click **Import an existing Git repository**

## Step 3: Select Repository

1. Select your repository from the list
2. Click **Begin setup**

## Step 4: Configure Build Settings

1. **Framework preset**: Select **Astro**
2. **Build command**: Change to `bun run build` (instead of npm)
3. **Build output directory**: `dist`
4. **Root directory**: (leave blank)

## Step 5: Setup Environment Variables for Turso

1. Click **Environment variables** section
2. Add these variables:

| Variable Name | Value |
|--------------|-------|
| `TURSO_DATABASE_URL` | Your database URL from bit2 deploy |
| `TURSO_AUTH_TOKEN` | Your auth token from bit2 deploy |

## Step 6: Deploy

1. Click **Save and Deploy**
2. Cloudflare will build and deploy your site
3. Your site will be live at: `https://YOUR_PROJECT.pages.dev`

## Features You Get

✅ **Global CDN** - Your site loads fast worldwide  
✅ **Automatic HTTPS** - Secure by default  
✅ **Preview Deployments** - Test changes before going live  
✅ **Web Analytics** - Free, privacy-focused analytics  
✅ **Custom Domains** - Use your own domain  
✅ **Unlimited Bandwidth** - No traffic limits  

## Next Steps

- **Custom Domain**: Settings → Custom domains → Add domain
- **Web Analytics**: Analytics → Web Analytics → Enable
- **Build Hooks**: Settings → Builds & deployments → Add build hook
- **Access Control**: Settings → Access → Configure

## Troubleshooting

### Build Fails
- Check build logs in Cloudflare dashboard
- Ensure all environment variables are set
- Verify `bun run build` works locally

### Database Connection Issues
- Double-check environment variable values
- Ensure no extra spaces in values
- Verify database is accessible from Cloudflare

### Need Help?
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Astro on Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [bit2 GitHub Issues](https://github.com/bitbons-ai/bit2/issues)