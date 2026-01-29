# AWS Amplify Troubleshooting Guide

## 🔴 Issue: 404 Page Not Found

### Quick Checks:

1. **Verify Build Succeeded**
   - Go to AWS Amplify Console
   - Check if the latest build has a green checkmark ✅
   - If red ❌, click on it to see build logs

2. **Common Build Failures:**

#### ❌ Missing Environment Variables
**Error:** `VITE_SUPABASE_URL is not defined`

**Fix:**
1. In Amplify Console → App Settings → Environment Variables
2. Add:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = your-key
   ```
3. Click "Save"
4. Go to app overview and click "Redeploy this version"

#### ❌ Wrong Build Command
**Error:** Build script not found

**Fix:**
1. Amplify Console → App Settings → Build Settings
2. Make sure `amplify.yml` is being used
3. Or manually set:
   - Build command: `npm run build`
   - Output directory: `dist`

#### ❌ Node Version Mismatch
**Error:** Node version incompatible

**Fix:** Add to `amplify.yml`:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 18
        - nvm use 18
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### ❌ npm install Fails
**Error:** Package installation failed

**Fix:**
1. Delete `node_modules` locally
2. Run `npm install` to regenerate `package-lock.json`
3. Commit and push changes
4. Or change `npm ci` to `npm install` in `amplify.yml`

---

## 🔍 How to Read Build Logs

1. **In Amplify Console:**
   - Click on your app
   - Click on the failed build (red X)
   - Expand each phase:
     - Provision
     - Build
     - Deploy
     - Verify

2. **Look for error messages in red**

3. **Common log locations:**
   - `npm install` errors → preBuild phase
   - Build errors → Build phase
   - Deploy errors → Deploy phase

---

## ✅ If Build Succeeded but Still 404

### Check Output Directory:

1. In build logs, look for:
   ```
   dist/index.html
   dist/assets/...
   ```

2. If files are in different folder:
   - Update `amplify.yml` baseDirectory
   - Or check `vite.config.ts` build output setting

### Check Rewrites/Redirects:

For SPA routing, add to `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'Strict-Transport-Security'
        value: 'max-age=31536000; includeSubDomains'
      - key: 'X-Frame-Options'
        value: 'SAMEORIGIN'
      - key: 'X-Content-Type-Options'
        value: 'nosniff'
```

---

## 🔄 Force Rebuild

If nothing else works:

1. **In Amplify Console:**
   - Go to your app
   - Click "Redeploy this version" button
   
2. **Or trigger new build:**
   - Make a small change (add comment to code)
   - Commit and push
   - Wait for automatic rebuild

---

## 🆘 Still Not Working?

### Option 1: Check Branch Name

Make sure you're looking at the right branch:
- If you pushed to `main`, go to: `https://main.dxxxxxx.amplifyapp.com`
- If you pushed to `staging`, go to: `https://staging.dxxxxxx.amplifyapp.com`

### Option 2: Manually Verify Files

In Amplify build logs, check if these files exist:
```
dist/index.html
dist/assets/index-[hash].js
dist/assets/index-[hash].css
```

If missing, build didn't complete properly.

### Option 3: Delete and Recreate

Sometimes cleanest solution:
1. Delete the Amplify app
2. Create new one
3. Follow QUICKSTART.md again

---

## 📋 Build Checklist

Before deploying, ensure:
- [ ] `package.json` has `build` script
- [ ] `amplify.yml` exists in root
- [ ] Environment variables are set
- [ ] Code is pushed to correct branch
- [ ] No TypeScript errors locally (`npm run build`)
- [ ] `.gitignore` excludes `node_modules`, `dist`, `.env.local`

---

## 💡 Pro Tips

1. **Test build locally first:**
   ```bash
   npm install
   npm run build
   # Check if dist/ folder is created
   ```

2. **Preview locally:**
   ```bash
   npm run preview
   # Opens built version at localhost:4173
   ```

3. **Check build time:**
   - Should complete in 2-5 minutes
   - If longer, might be stuck

4. **Enable build notifications:**
   - Amplify Console → Notifications
   - Get email when builds fail

---

## 🔗 Useful Links

- AWS Amplify Console: https://console.aws.amazon.com/amplify/
- Amplify Docs: https://docs.aws.amazon.com/amplify/
- Build Specification: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html

---

## 📞 Get Help

If still stuck, check:
1. Build logs in Amplify Console
2. Browser console for JavaScript errors (F12)
3. Network tab for failed requests

Share the error message and I can help debug!




