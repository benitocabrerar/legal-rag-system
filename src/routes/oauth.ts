import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export async function oauthRoutes(fastify: FastifyInstance) {
  // Initiate Google OAuth flow
  fastify.get('/auth/google', async (request, reply) => {
    const redirectUri = GOOGLE_CALLBACK_URL;
    const scope = 'openid email profile';
    const responseType = 'code';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    return reply.redirect(authUrl);
  });

  // Google OAuth callback
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const { code } = request.query as { code: string };

      if (!code) {
        return reply.code(400).send({ error: 'Authorization code missing' });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json() as GoogleTokenResponse;

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const googleUser = await userInfoResponse.json() as GoogleUserInfo;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { googleId: googleUser.id },
      });

      if (!user) {
        // Check if user exists with same email
        user = await prisma.user.findUnique({
          where: { email: googleUser.email },
        });

        if (user) {
          // Link Google account to existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleUser.id,
              provider: 'google',
              avatarUrl: googleUser.picture,
            },
          });
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: googleUser.email,
              name: googleUser.name,
              googleId: googleUser.id,
              provider: 'google',
              avatarUrl: googleUser.picture,
              role: 'user',
              planTier: 'free',
            },
          });

          // Create default quota for new user
          await prisma.userQuota.create({
            data: {
              userId: user.id,
              resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });
        }
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }))}`;

      return reply.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  });
}
