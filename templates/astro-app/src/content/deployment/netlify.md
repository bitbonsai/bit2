---
title: Deploy to Netlify
provider: Netlify
buildCommand: bun run build
outputDir: dist
envVars: [TURSO_DATABASE_URL, TURSO_AUTH_TOKEN]
---

# Deploy to Netlify

Netlify provides powerful deployment features with excellent developer tools and workflow integration.

## Prerequisites

- Netlify account (free at [netlify.com](https://netlify.com))
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

## Step 2: Import to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose your Git provider
4. Authenticate if needed
5. Select your repository

## Step 3: Configure Build Settings

Netlify auto-detects Astro! Confirm these settings:

- **Build command**: `bun run build`
- **Publish directory**: `dist`
- **Functions directory**: (leave blank)

## Step 4: Add Environment Variables

Before deploying, click **Show advanced** then **New variable**:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | Your database URL from bit2 deploy |
| `TURSO_AUTH_TOKEN` | Your auth token from bit2 deploy |

## Step 5: Deploy

1. Click **Deploy site**
2. Netlify will build and deploy your site
3. Get instant URL: `https://RANDOM_NAME.netlify.app`
4. Rename in Site settings → Change site name

## Features You Get

✅ **Continuous Deployment** - Auto-deploy on git push  
✅ **Deploy Previews** - Test every pull request  
✅ **Split Testing** - A/B test deployments  
✅ **Forms Handling** - Built-in form processing  
✅ **Edge Functions** - Run code at the edge  
✅ **Custom Domains** - Use your own domain  

## Next Steps

- **Custom Domain**: Domain settings → Add custom domain
- **Deploy Notifications**: Site settings → Notifications
- **Build Hooks**: Site settings → Build hooks
- **Access Control**: Site settings → Access control
- **Analytics**: Enable Netlify Analytics (paid feature)

## Automatic Deployments

After setup, deployments are automatic:
- **Production**: Push to main branch
- **Deploy Previews**: Create pull requests
- **Branch Deploys**: Push to any branch

## Advanced Configuration

Create `netlify.toml` in your project root for more control:

```toml
[build]
  command = "bun run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

## Troubleshooting

### Build Fails
- Check deploy logs in Netlify dashboard
- Verify all environment variables
- Test `bun run build` locally

### Database Connection Issues
- Double-check environment variables
- No extra spaces or quotes in values
- Verify Turso database is active

### Site Not Updating
- Check deployment status
- Clear build cache: Deploy settings → Clear cache
- Trigger manual deploy

### Need Help?
- [Netlify Docs](https://docs.netlify.com)
- [Astro on Netlify](https://docs.astro.build/en/guides/deploy/netlify/)
- [bit2 GitHub Issues](https://github.com/bitbons-ai/bit2/issues)