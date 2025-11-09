# Add Admin User Instructions

This guide explains how to add **benitocabrerar@gmail.com** as a system administrator.

## 🎯 What This Does

- Creates or updates user: **benitocabrerar@gmail.com**
- Sets role to: **admin** (full system access)
- Sets plan to: **team** (unlimited features)
- Allows access to Admin Panel and all features

## 📋 Prerequisites

Before running the script, ensure you have:

1. Node.js installed
2. Database connection configured (DATABASE_URL in .env)
3. Prisma client generated (`npm run prisma:generate`)

## 🚀 Method 1: Using NPM Script (Recommended)

This is the easiest method:

```bash
# Run the script
npm run add:admin
```

That's it! The script will:
- Check if user exists
- Create or update the user as admin
- Display confirmation

## 🔧 Method 2: Direct Node Execution

If you prefer to run the script directly:

```bash
# Navigate to project root
cd C:\Users\benito\poweria\legal

# Run the script
node scripts/add-admin.js
```

## 💾 Method 3: SQL Script (Database Direct Access)

If you have direct database access, you can run the SQL script:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Run the SQL script
\i scripts/create-admin-user.sql
```

Or copy the SQL content and paste it into your database management tool.

## 📝 What Happens

### If User Doesn't Exist:
```
✅ Admin user created successfully!

📋 User Details:
   ID: [auto-generated UUID]
   Email: benitocabrerar@gmail.com
   Name: Benito Cabrera
   Role: admin
   Plan: team
   Created: [timestamp]

✨ User is now a SYSTEM ADMINISTRATOR with TEAM plan access!
```

### If User Already Exists:
```
👤 User found. Updating to admin role...

✅ User updated successfully!

📋 User Details:
   ID: [existing UUID]
   Email: benitocabrerar@gmail.com
   Role: admin (UPDATED)
   Plan: team (UPDATED)
```

## 🔐 Password Setup

The user account is created WITHOUT a password for security. To log in, the user must:

1. Go to the login page
2. Click **"Forgot Password"**
3. Enter email: **benitocabrerar@gmail.com**
4. Follow the password reset link sent via email
5. Create a new secure password

Alternatively, you can implement OAuth/SSO for passwordless login.

## ⚙️ Admin Capabilities

Once logged in as admin, the user will have access to:

### 📚 Legal Library Management
- Upload legal documents (Constitution, Laws, Codes, Decrees, etc.)
- Organize by category and jurisdiction
- Manage the knowledge base

### 📤 Bulk Document Upload
- Upload multiple documents simultaneously
- Process large batches efficiently
- Monitor processing queue

### 🔍 Embeddings Control
- Monitor vector database
- View processing statistics
- Reindex documents
- Test semantic search

### 👥 User Management
- Create, edit, delete users
- Assign roles (admin, lawyer, client)
- Manage subscription plans
- View user activity

### 📊 Analytics Dashboard
- System usage metrics
- Cost tracking
- Performance monitoring
- User activity reports

## 🔒 Security Notes

- The admin user has **full system access** - use responsibly
- Only trusted individuals should have admin role
- Admin actions are logged for security auditing
- Consider enabling 2FA for admin accounts in production

## 🧪 Testing Admin Access

After creating the admin user:

1. **Login Test**
   - Go to login page
   - Reset password using "Forgot Password"
   - Login with new password

2. **Admin Panel Access**
   - Navigate to `/admin` route
   - Verify all admin sections are accessible
   - Test each admin feature

3. **Permissions Test**
   - Try creating/editing users
   - Upload a legal document
   - Access analytics dashboard
   - Test embeddings control

## 🔄 Updating Existing User

If **benitocabrerar@gmail.com** already exists in the system, the script will:
- Keep the existing user ID and data
- Update role to 'admin'
- Update plan to 'team'
- Keep all existing cases and documents

## ❌ Troubleshooting

### Error: "Cannot connect to database" or "Server has closed the connection"
**Solution:**
- Check DATABASE_URL in .env file
- Verify Render database is running (if using Render)
- Check network connectivity
- Try using the SQL method directly on the database (Method 3)

### Error: "Prisma client not generated"
**Solution:** Run `npm run prisma:generate`

### Error: "User already exists" (SQL method)
**Solution:** The SQL script deletes existing user first. This is intentional.

### Error: "Permission denied"
**Solution:** Ensure you have write access to the database

## 🎯 Quick Reference

```bash
# Quick command to add admin
npm run add:admin

# If successful, you'll see:
✅ Admin user created successfully!
✨ User is now a SYSTEM ADMINISTRATOR!

# Next steps:
1. User resets password via "Forgot Password"
2. User logs in
3. User accesses Admin Panel at /admin
```

## 📞 Support

If you encounter issues:
1. Check DATABASE_URL is correct
2. Verify database is accessible
3. Ensure Prisma client is generated
4. Check logs for specific error messages

## ✅ Success Checklist

- [ ] Script executed without errors
- [ ] Confirmation message displayed
- [ ] User can reset password
- [ ] User can login
- [ ] User can access `/admin` route
- [ ] All admin features work correctly

---

**Last Updated:** November 7, 2025
**Version:** 1.0
