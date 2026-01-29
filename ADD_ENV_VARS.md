# How to Add Environment Variables to AWS Amplify

## 🔐 Step-by-Step Instructions

### Step 1: Get Your Supabase Credentials

1. Go to: **https://app.supabase.com**
2. Click on your **Spaceship Bot project** (or whichever project this is)
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** in the settings menu
5. You'll see:
   - **Project URL** - Copy this! (looks like `https://xxxxx.supabase.co`)
   - **Project API keys** section
     - **anon/public** key - Copy this! (long string starting with `eyJ...`)

### Step 2: Add to AWS Amplify

1. Go to: **https://console.aws.amazon.com/amplify/**
2. Click on your app name
3. Click **"App settings"** in the left sidebar
4. Click **"Environment variables"**
5. Click **"Manage variables"** button
6. Click **"Add variable"** (twice, to add two variables)

**Add Variable #1:**
```
Variable name: VITE_SUPABASE_URL
Value: https://your-project-id.supabase.co
```
(Paste your actual Supabase URL here)

**Add Variable #2:**
```
Variable name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Paste your actual anon/public key here)

7. Click **"Save"**

### Step 3: Redeploy

1. Go back to app overview (click your app name at top)
2. Find the green checkmark build
3. Click the **"Redeploy this version"** button
4. Wait 2-3 minutes for rebuild
5. Click the URL when done!

## ✅ Verification

After redeploying:
- Your app should load properly
- No 404 errors
- Supabase features should work

## ⚠️ Important Notes

- **Use the "anon/public" key**, NOT the "service_role" key
- The URL must start with `https://`
- Don't add quotes around the values
- Variable names are case-sensitive (use UPPERCASE)

## 🎯 What Your Environment Variables Should Look Like

Example (with fake values):

```
VITE_SUPABASE_URL = https://abcdefgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjM0NTY3ODksImV4cCI6MTkzOTAzMjc4OX0.abc123def456
```

Make sure yours look similar!




