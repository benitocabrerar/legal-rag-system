# AWS S3 Quick Setup Guide

## 5-Minute Setup Checklist

### Step 1: Create S3 Bucket (2 minutes)

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3)
2. Click **Create bucket**
3. Configure:
   - **Bucket name:** `legal-rag-documents` (must be globally unique)
   - **Region:** `us-east-1` (or your preferred region)
   - **Block Public Access:** ✅ Enable all (keep bucket private)
   - **Bucket Versioning:** Optional (recommended for production)
   - **Default encryption:** Server-side encryption with Amazon S3 managed keys (SSE-S3)
4. Click **Create bucket**

### Step 2: Configure CORS (1 minute)

1. Select your bucket
2. Go to **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Click **Edit**
5. Paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

6. Click **Save changes**

**Note:** Replace `https://your-production-domain.com` with your actual domain

### Step 3: Create IAM User (2 minutes)

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
2. Click **Users** > **Add users**
3. **User name:** `legal-documents-uploader`
4. **Access type:** ✅ Programmatic access
5. Click **Next: Permissions**
6. Click **Attach policies directly**
7. Click **Create policy** (opens new tab)
8. Switch to **JSON** tab
9. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::legal-rag-documents/*"
    },
    {
      "Sid": "S3BucketList",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::legal-rag-documents"
    }
  ]
}
```

**Important:** Replace `legal-rag-documents` with your actual bucket name

10. Click **Next: Tags** (skip tags)
11. Click **Next: Review**
12. **Policy name:** `LegalDocumentsS3Access`
13. Click **Create policy**
14. Go back to user creation tab, refresh policies
15. Search and select `LegalDocumentsS3Access`
16. Click **Next: Tags** > **Next: Review** > **Create user**
17. **IMPORTANT:** Copy the **Access key ID** and **Secret access key**
    - You won't be able to see the secret key again!
    - Save them securely

### Step 4: Configure Environment Variables (1 minute)

1. Open your project's `.env` file
2. Add these lines:

```env
# AWS S3 Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."  # Paste from Step 3
AWS_SECRET_ACCESS_KEY="..."   # Paste from Step 3
AWS_S3_BUCKET="legal-rag-documents"  # Your bucket name
```

3. Save the file
4. **NEVER commit `.env` to git** (should be in `.gitignore`)

### Step 5: Test the Integration

```bash
# 1. Install dependencies (if not already done)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 2. Restart backend
npm run dev

# 3. Upload a test document
# - Go to http://localhost:3000/admin/legal-library
# - Click "Upload Document"
# - Select a PDF file
# - Submit

# 4. Check backend logs
# Should see: "PDF uploaded to S3: legal-documents/abc-123/... (X bytes)"

# 5. Open document in PDF viewer
# - Click "Edit" on the uploaded document
# - PDF should load in left panel

# 6. Verify in AWS S3 Console
# - Go to your bucket
# - Should see files under "legal-documents/" folder
```

## Troubleshooting

### Error: "The security token is invalid"
**Cause:** Wrong AWS credentials
**Fix:** Double-check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`

### Error: "Access Denied"
**Cause:** IAM policy incorrect or bucket name mismatch
**Fix:**
- Verify bucket name in policy matches actual bucket
- Ensure IAM policy is attached to user
- Check bucket region matches `AWS_REGION`

### Error: "Bucket does not exist"
**Cause:** Bucket name or region mismatch
**Fix:** Verify `AWS_S3_BUCKET` and `AWS_REGION` in `.env` match actual bucket

### PDF doesn't load in viewer
**Cause:** Missing S3 key in metadata
**Fix:**
1. Check backend logs during upload
2. Verify document metadata in database has `s3Key` field
3. Re-upload document if needed

### CORS error in browser console
**Cause:** CORS not configured or wrong origin
**Fix:**
1. Verify CORS configuration in S3 bucket
2. Add your frontend URL to `AllowedOrigins`
3. Restart browser to clear cache

## Production Deployment

### Additional Steps for Production:

1. **Use Separate Bucket for Production**
   ```env
   # Production .env
   AWS_S3_BUCKET="legal-rag-documents-prod"
   ```

2. **Update CORS with Production Domain**
   ```json
   "AllowedOrigins": [
     "https://app.yourdomain.com",
     "https://yourdomain.com"
   ]
   ```

3. **Enable CloudWatch Logging**
   - Go to bucket Properties
   - Enable Server access logging
   - Monitor upload/download activity

4. **Set up Backup**
   - Enable versioning on bucket
   - Configure lifecycle rules for old versions
   - Set up cross-region replication (optional)

5. **Monitor Costs**
   - Set up billing alerts in AWS
   - Monitor CloudWatch metrics
   - Review Cost Explorer monthly

## Security Best Practices

### ✅ DO:
- Keep bucket private (block all public access)
- Use presigned URLs for temporary access
- Rotate IAM credentials periodically
- Enable encryption at rest (SSE-S3)
- Monitor CloudWatch for suspicious activity
- Use separate buckets for dev/staging/production
- Set up IAM policies with least privilege

### ❌ DON'T:
- Make bucket public
- Hardcode credentials in code
- Commit `.env` to git
- Share AWS credentials
- Use root AWS account credentials
- Allow anonymous access
- Give full S3 access to IAM user

## Cost Optimization

### Storage Class Options:

| Class | Use Case | Cost/GB/month |
|-------|----------|---------------|
| Standard | Frequently accessed | $0.023 |
| Intelligent-Tiering | Auto-optimize | $0.023 + $0.0025 monitoring |
| Standard-IA | Infrequently accessed | $0.0125 + retrieval fee |
| Glacier Instant Retrieval | Archive (ms retrieval) | $0.004 + retrieval fee |

**Recommendation:** Start with Standard, switch to Intelligent-Tiering if costs grow

### Lifecycle Rules:

Automatically transition old documents to cheaper storage:

```json
{
  "Rules": [
    {
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER_INSTANT_RETRIEVAL"
        }
      ]
    }
  ]
}
```

## Support Resources

- **AWS S3 Documentation:** https://docs.aws.amazon.com/s3/
- **AWS SDK v3 for JavaScript:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/
- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **S3 Pricing Calculator:** https://calculator.aws/

## Quick Commands

### Test AWS Credentials
```bash
# List bucket contents
aws s3 ls s3://legal-rag-documents/ --region us-east-1

# Upload test file
echo "test" > test.txt
aws s3 cp test.txt s3://legal-rag-documents/test/ --region us-east-1

# Download file
aws s3 cp s3://legal-rag-documents/test/test.txt ./downloaded.txt --region us-east-1

# Delete file
aws s3 rm s3://legal-rag-documents/test/test.txt --region us-east-1
```

### Check S3 Usage
```bash
# Get bucket size
aws s3 ls s3://legal-rag-documents --recursive --summarize --region us-east-1

# Count files
aws s3 ls s3://legal-rag-documents --recursive --region us-east-1 | wc -l
```

---

**Setup Time:** ~5 minutes
**Difficulty:** Easy
**Cost:** ~$0.05/month (for small usage)
