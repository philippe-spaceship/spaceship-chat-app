# Quick Start Guide: Deploy to AWS

## 🚀 Fastest Way: AWS Amplify (5 minutes)

### 1. Push to GitHub
```bash
cd spaceships-chat-log-main
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/spaceship-bot.git
git push -u origin main
```

### 2. Deploy to Amplify
1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** and authorize AWS Amplify
4. Select your repository and branch
5. Amplify will detect the `amplify.yml` automatically
6. Click **"Advanced settings"** and add:
   ```
   VITE_SUPABASE_URL = your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY = your_supabase_key
   ```
7. Click **"Save and deploy"**
8. Wait 3-5 minutes ☕

### 3. Add Your Domain
1. In Amplify, go to **"Domain management"**
2. Click **"Add domain"**
3. Enter your domain name
4. Follow DNS instructions for your provider
5. Wait 15-30 minutes for SSL certificate

**Done!** 🎉

---

## 📋 What You Need

Before starting, gather:
- [ ] AWS Account (create at aws.amazon.com)
- [ ] Your domain name
- [ ] Supabase URL (from https://app.supabase.com)
- [ ] Supabase Anon Key (from project settings → API)
- [ ] GitHub/GitLab account (for Amplify option)

---

## 💰 Costs

**AWS Amplify:**
- First 1,000 build minutes: FREE
- Hosting: $0.15/GB (usually <$5/month for small sites)

**Free Tier includes:**
- 5 GB stored
- 15 GB served/month
- SSL certificate: FREE

---

## 🆘 Troubleshooting

**Build fails?**
- Check environment variables are set correctly
- Verify `amplify.yml` is in root directory

**Can't connect to Supabase?**
- Verify VITE_SUPABASE_URL starts with https://
- Check Supabase project is not paused
- Ensure anon key is correct (not service role key)

**Domain not working?**
- DNS can take 24-48 hours to propagate
- Use `nslookup yourdomain.com` to check DNS
- Verify CNAME records are correct

---

## 📚 More Options

See `DEPLOYMENT_GUIDE.md` for:
- S3 + CloudFront deployment
- Docker + App Runner
- Detailed troubleshooting
- Cost comparisons

---

## ✅ Post-Deployment Checklist

After deployment:
- [ ] Test all pages and features
- [ ] Verify Supabase connections work
- [ ] Check SSL certificate (should be green padlock)
- [ ] Test on mobile devices
- [ ] Set up custom 404 page (optional)
- [ ] Configure analytics (optional)

---

Need help? Check the full guide in `DEPLOYMENT_GUIDE.md`

