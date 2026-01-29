# Supabase Edge Functions Deployment Guide

## 📋 Prerequisites

- Node.js installed
- Supabase account and project
- Your Supabase project reference: `ejgvdscyadtqrsouvorq`

## 🚀 Quick Start

### 1. Install Supabase CLI

**Option A: Using npm (Recommended)**
```powershell
npm install -g supabase
```

**Option B: Using Scoop**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Login to Supabase

```powershell
supabase login
```

This will open your browser to authenticate.

### 3. Link Your Project

```powershell
cd spaceships-chat-log-main\spaceships-chat-log-main
supabase link --project-ref ejgvdscyadtqrsouvorq
```

You'll be prompted for your database password. Get it from:
- Supabase Dashboard → Project Settings → Database → Connection string

### 4. Deploy Functions

**Deploy All Functions:**
```powershell
supabase functions deploy
```

**Or Deploy Individually:**
```powershell
supabase functions deploy spaceship-query
supabase functions deploy add-comment
supabase functions deploy add-document
supabase functions deploy add-url
supabase functions deploy analytics-citation
supabase functions deploy delete-document
supabase functions deploy delete-url
supabase functions deploy list-documents
supabase functions deploy list-urls
supabase functions deploy load-conversations
supabase functions deploy rate-message
```

### 5. Use the Deployment Script (Easiest)

```powershell
cd spaceships-chat-log-main\spaceships-chat-log-main
.\deploy-functions.ps1
```

## 📝 Your Function URLs

After deployment, your functions will be available at:

```
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/spaceship-query
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/add-comment
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/add-document
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/add-url
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/analytics-citation
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/delete-document
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/delete-url
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/list-documents
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/list-urls
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/load-conversations
https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/rate-message
```

## 🔐 Authentication

To call your functions, use the Authorization header with your anon key:

```bash
curl -L -X POST 'https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/spaceship-query' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{"query":"Hello"}'
```

## 🔑 Setting Environment Variables for Functions

If your functions need secrets (API keys, etc.):

```powershell
# Set a secret
supabase secrets set MY_API_KEY=your_key_here

# List all secrets
supabase secrets list

# Remove a secret
supabase secrets unset MY_API_KEY
```

## 🧪 Testing Functions Locally

Before deploying, you can test locally:

```powershell
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Test function
curl -L -X POST 'http://localhost:54321/functions/v1/spaceship-query' \
  -H 'Authorization: Bearer YOUR_LOCAL_ANON_KEY' \
  --data '{"query":"test"}'
```

## 📊 View Function Logs

```powershell
# View logs for a specific function
supabase functions logs spaceship-query

# Follow logs in real-time
supabase functions logs spaceship-query --follow
```

## 🔄 Update a Function

After making changes to a function:

```powershell
# Redeploy the specific function
supabase functions deploy spaceship-query
```

## ⚠️ Troubleshooting

### Error: "Not logged in"
```powershell
supabase login
```

### Error: "Project not linked"
```powershell
supabase link --project-ref ejgvdscyadtqrsouvorq
```

### Error: "Permission denied"
Make sure you're logged in with an account that has access to this project.

### Function deployment fails
Check the function code for errors:
```powershell
cd supabase/functions/[function-name]
deno run --allow-all index.ts
```

## 📚 Useful Commands

```powershell
# List all functions
supabase functions list

# Delete a function
supabase functions delete [function-name]

# Get function info
supabase functions info [function-name]

# Download function code
supabase functions download [function-name]
```

## 🎯 Next Steps

1. Deploy functions: `.\deploy-functions.ps1`
2. Test each function with curl or Postman
3. Update your frontend to use the deployed function URLs
4. Monitor function logs for any issues

## 📞 Need Help?

- Supabase Docs: https://supabase.com/docs/guides/functions
- Supabase CLI Docs: https://supabase.com/docs/reference/cli/introduction




