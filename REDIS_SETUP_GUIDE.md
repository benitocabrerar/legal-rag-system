# Redis Configuration Guide for Document Analysis System

## Overview
The document analysis system requires Redis for:
- Background job queue management (BullMQ)
- Caching document embeddings and analysis results
- Real-time notifications via pub/sub

## Redis Instance Details
- **Name**: legal-rag-redis
- **Plan**: Starter
- **Region**: Oregon
- **Version**: 8.1.4
- **Status**: Available
- **ID**: `red-d46iavchg0os73avgqq0`

## Step 1: Get Redis Connection Details from Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/r/red-d46iavchg0os73avgqq0)
2. Click on the **legal-rag-redis** instance
3. In the "Connections" section, you'll find:
   - **Internal Redis URL** (format: `redis://default:password@hostname:port`)
   - Or separate fields for:
     - **Host** (internal hostname)
     - **Port** (typically 6379)
     - **Password**

## Step 2: Add Environment Variables to API Service

Add the following environment variables to the **legal-rag-api** service:

### Option A: Using Internal Redis URL (Recommended)
If Render provides a full Redis URL, parse it and add:

```
REDIS_HOST=<hostname from URL>
REDIS_PORT=6379
REDIS_PASSWORD=<password from URL>
```

### Option B: Using Render's Connection Details
Use the values directly from the Render dashboard:

```
REDIS_HOST=<hostname from dashboard>
REDIS_PORT=<port from dashboard>
REDIS_PASSWORD=<password from dashboard>
```

## Step 3: Add Environment Variables via Render Dashboard

1. Go to [legal-rag-api service](https://dashboard.render.com/web/srv-d46ibnfdiees73crug50)
2. Go to **Environment** tab
3. Add the three variables:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`
4. Click **Save Changes**
5. The service will automatically redeploy

## Alternative: Update via API (If you have the values)

If you have the Redis credentials, you can update them via API:

```bash
curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/admin/env/update \
  -H "Content-Type: application/json" \
  -d '{
    "envVars": [
      {"key": "REDIS_HOST", "value": "<your-redis-host>"},
      {"key": "REDIS_PORT", "value": "6379"},
      {"key": "REDIS_PASSWORD", "value": "<your-redis-password>"}
    ]
  }'
```

## Step 4: Verify Redis Connection

After deployment, verify the connection by checking the service logs:

```bash
curl https://legal-rag-api-qnew.onrender.com/health
```

The background worker should connect to Redis automatically on startup.

## Troubleshooting

### Connection Refused
- Verify REDIS_HOST is the internal hostname (not external)
- Ensure the API service and Redis are in the same region (Oregon)
- Check that REDIS_PASSWORD is correct

### Authentication Failed
- Double-check the REDIS_PASSWORD value
- Ensure there are no extra spaces in the environment variable

### Port Issues
- Default Redis port is 6379
- Render may use a different port - check dashboard

## Next Steps After Configuration

Once Redis is configured:
1. ✅ The background worker will start automatically
2. ✅ Document analysis jobs will be processed
3. ✅ Notifications will be sent via pub/sub
4. ✅ Embeddings will be cached for faster queries

## System Components Using Redis

- **documentProcessor Worker**: BullMQ queues for analysis jobs
- **NotificationService**: Pub/sub for real-time notifications
- **DocumentRegistry**: Caching document hierarchies
- **Rate Limiter**: Request rate limiting (middleware)

---

**Important**: Redis configuration is required before the document analysis system can function. Without it, document uploads will still work, but automatic analysis will be queued and pending until Redis is configured.
