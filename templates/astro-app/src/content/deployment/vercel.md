---
title: Deploy to Vercel
provider: Vercel
buildCommand: bun run build
outputDir: dist
envVars: [TURSO_DATABASE_URL, TURSO_AUTH_TOKEN]
---

# Deploy to Vercel

Vercel offers seamless deployment with automatic scaling and excellent developer experience.

## Prerequisites

- Vercel account (free at [vercel.com](https://vercel.com))
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

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your Git provider (GitHub/GitLab/Bitbucket)
4. Choose your repository from the list

## Step 3: Configure Project

Vercel auto-detects Astro! Verify these settings:

- **Framework Preset**: Astro (auto-detected)
- **Build Command**: `bun run build`
- **Output Directory**: `dist`
- **Install Command**: `bun install`

## Step 4: Add Environment Variables

Before deploying, click **Environment Variables** and add:

| Variable Name | Value |
|--------------|-------|
| `TURSO_DATABASE_URL` | Your database URL from bit2 deploy |
| `TURSO_AUTH_TOKEN` | Your auth token from bit2 deploy |

## Step 5: Deploy

1. Click **Deploy**
2. Vercel will build and deploy your application
3. Get instant preview URL
4. Production URL: `https://YOUR_PROJECT.vercel.app`

## Features You Get

✅ **Automatic Deployments** - Push to deploy  
✅ **Preview Environments** - Test every branch  
✅ **Edge Functions** - Run code at the edge  
✅ **Analytics** - Real user metrics  
✅ **Speed Insights** - Performance monitoring  
✅ **Custom Domains** - Use your own domain  

## Next Steps

- **Custom Domain**: Settings → Domains → Add
- **Analytics**: Enable in project dashboard
- **Speed Insights**: Analytics → Speed Insights
- **Environment Variables**: Settings → Environment Variables
- **Deploy Hooks**: Settings → Git → Deploy Hooks

## Automatic Deployments

After initial setup:
- **Production**: Push to `main` branch
- **Preview**: Push to any other branch
- **Comments**: Get deployment URLs in pull requests

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Test `bun run build` locally

### Database Connection Issues
- Verify environment variable values
- Check for extra spaces or quotes
- Ensure database is accessible

### Slow Initial Load
- Normal for serverless cold starts
- Consider enabling Edge Functions
- Check function region settings

### Need Help?
- [Vercel Docs](https://vercel.com/docs)
- [Astro on Vercel](https://docs.astro.build/en/guides/deploy/vercel/)
- [bit2 GitHub Issues](https://github.com/bitbons-ai/bit2/issues)