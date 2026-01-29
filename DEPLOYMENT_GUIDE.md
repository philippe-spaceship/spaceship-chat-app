# Deployment Guide: Spaceship Bot to AWS

## Prerequisites
- AWS Account
- Domain name (purchased from Route 53, GoDaddy, Namecheap, etc.)
- Supabase project URL and Anon Key
- Git repository (GitHub, GitLab, Bitbucket, or AWS CodeCommit)

---

## Option 1: AWS Amplify (Recommended)

### Step 1: Push Your Code to a Git Repository

```bash
cd spaceships-chat-log-main
git init
git add .
git commit -m "Initial commit"
# Push to GitHub/GitLab/Bitbucket
```

### Step 2: Deploy to AWS Amplify

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect Your Repository**
   - Select your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
   - Authorize AWS Amplify to access your repository
   - Select the repository and branch (usually `main` or `master`)

3. **Configure Build Settings**
   - Amplify should auto-detect the `amplify.yml` file
   - If not, use these settings:
     - Build command: `npm run build`
     - Base directory: (leave empty)
     - Output directory: `dist`

4. **Add Environment Variables**
   - Click "Advanced settings"
   - Add these environment variables:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
     ```
   - Get these values from your Supabase project settings

5. **Save and Deploy**
   - Click "Save and deploy"
   - Wait 3-5 minutes for the build to complete
   - You'll get a temporary URL like: `https://main.d123456.amplifyapp.com`

### Step 3: Add Custom Domain

1. **In Amplify Console**
   - Go to "Domain management" in the left sidebar
   - Click "Add domain"

2. **If Domain is in Route 53:**
   - Select your domain from dropdown
   - Amplify will automatically configure DNS
   - Click "Save"

3. **If Domain is External (GoDaddy, Namecheap, etc.):**
   - Enter your domain name
   - Amplify will provide CNAME records
   - Add these records to your domain provider's DNS settings:
     ```
     Type: CNAME
     Name: www (or @)
     Value: (provided by Amplify)
     ```
   - Click "Save"

4. **SSL Certificate**
   - Amplify automatically provisions and renews SSL certificates
   - Wait 15-30 minutes for DNS propagation
   - Your site will be live at `https://yourdomain.com`

---

## Option 2: S3 + CloudFront + Route 53

### Step 1: Build Your Project

```bash
cd spaceships-chat-log-main
npm install
npm run build
```

### Step 2: Create S3 Bucket

1. **Go to S3 Console**: https://s3.console.aws.amazon.com/
2. **Create bucket**:
   - Name: `yourdomain.com` (use exact domain name)
   - Region: Choose closest to your users
   - Uncheck "Block all public access"
   - Create bucket

3. **Upload Files**:
   - Upload all files from the `dist` folder
   - Make sure to upload the entire contents

4. **Configure Static Website Hosting**:
   - Go to bucket → Properties → Static website hosting
   - Enable static website hosting
   - Index document: `index.html`
   - Error document: `index.html` (for SPA routing)
   - Save changes

5. **Set Bucket Policy**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::yourdomain.com/*"
       }
     ]
   }
   ```

### Step 3: Create CloudFront Distribution

1. **Go to CloudFront Console**: https://console.aws.amazon.com/cloudfront/
2. **Create distribution**:
   - Origin domain: Select your S3 bucket
   - Origin access: Public
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Alternate domain names (CNAMEs): `yourdomain.com`, `www.yourdomain.com`
   - Custom SSL certificate: Request certificate (via ACM)
   - Default root object: `index.html`

3. **Request SSL Certificate**:
   - Click "Request certificate"
   - Add domain names: `yourdomain.com` and `*.yourdomain.com`
   - Validation method: DNS validation
   - Add CNAME records to your DNS provider
   - Wait for validation (5-30 minutes)

4. **Configure Error Pages** (for SPA routing):
   - Go to distribution → Error pages
   - Create custom error response:
     - HTTP error code: 403
     - Customize error response: Yes
     - Response page path: `/index.html`
     - HTTP response code: 200
   - Repeat for 404 error code

### Step 4: Configure Route 53 (or Your DNS Provider)

**If using Route 53:**
1. Go to Route 53 Console
2. Create hosted zone (if not exists)
3. Create A record:
   - Record name: (empty for root domain)
   - Record type: A
   - Alias: Yes
   - Route traffic to: CloudFront distribution
   - Choose your distribution

**If using external DNS provider:**
1. Add CNAME record:
   ```
   Type: CNAME
   Name: www
   Value: d123456.cloudfront.net (your CloudFront domain)
   ```
2. For root domain, use ANAME or ALIAS record (if supported)

---

## Option 3: Docker + AWS App Runner

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### Step 2: Create nginx.conf

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 3: Build and Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name spaceship-bot

# Build and push
docker build -t spaceship-bot .
docker tag spaceship-bot:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/spaceship-bot:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/spaceship-bot:latest
```

### Step 4: Deploy to App Runner

1. Go to AWS App Runner Console
2. Create service from ECR
3. Configure custom domain in App Runner settings

---

## Environment Variables Configuration

Make sure to set these environment variables in your deployment:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Get these from: Supabase Dashboard → Project Settings → API

---

## Supabase Edge Functions

If you're using Supabase Edge Functions (in the `supabase/functions` folder), deploy them separately:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy spaceship-query
```

---

## Cost Estimates

### AWS Amplify:
- Build minutes: $0.01/minute (first 1000 free)
- Hosting: $0.15/GB stored, $0.15/GB served
- **Estimated**: $5-20/month for small traffic

### S3 + CloudFront:
- S3 storage: $0.023/GB
- CloudFront data transfer: $0.085/GB (first 10TB)
- **Estimated**: $1-10/month for small traffic

### App Runner:
- Memory and CPU based pricing
- **Estimated**: $25-50/month minimum

---

## Troubleshooting

### 404 Errors on Page Refresh
- **S3/CloudFront**: Configure error pages to serve `index.html`
- **Amplify**: Add rewrites in `amplify.yml`

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is not paused
- Verify API keys are correct

### Custom Domain Not Working
- Wait 24-48 hours for DNS propagation
- Verify CNAME/A records are correct
- Check SSL certificate status

---

## Recommended: AWS Amplify

For your use case, I recommend **AWS Amplify** because:
✅ Easiest setup and deployment
✅ Automatic builds on git push
✅ Free SSL certificates
✅ Automatic custom domain configuration
✅ Preview deployments for branches
✅ Environment variable management
✅ CI/CD built-in

---

## Next Steps

1. Choose your deployment option
2. Push code to Git repository (for Amplify)
3. Set up Supabase environment variables
4. Deploy using the steps above
5. Configure custom domain
6. Test thoroughly

Need help with any specific step? Let me know!

