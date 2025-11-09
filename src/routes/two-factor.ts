import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { z } from 'zod';

const prisma = new PrismaClient();

const setupTwoFactorSchema = z.object({
  enable2FA: z.boolean(),
});

const verifyTwoFactorSchema = z.object({
  token: z.string().length(6),
});

const disableTwoFactorSchema = z.object({
  password: z.string(),
  token: z.string().length(6),
});

export async function twoFactorRoutes(fastify: FastifyInstance) {
  // Generate 2FA secret and QR code
  fastify.post('/auth/2fa/setup', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Legal RAG (${(request.user as any).email})`,
        issuer: 'Legal RAG System',
      });

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url as string);

      // Store secret temporarily (not enabled yet until verified)
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret.base32,
          twoFactorEnabled: false,
        },
      });

      return reply.send({
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        otpauthUrl: secret.otpauth_url,
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      return reply.code(500).send({ error: 'Failed to setup 2FA' });
    }
  });

  // Verify and enable 2FA
  fastify.post('/auth/2fa/verify', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const body = verifyTwoFactorSchema.parse(request.body);

      // Get user's secret
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true },
      });

      if (!user || !user.twoFactorSecret) {
        return reply.code(400).send({ error: '2FA not set up. Please setup first.' });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: body.token,
        window: 2, // Allow 2 time steps before/after
      });

      if (!verified) {
        return reply.code(400).send({ error: 'Invalid verification code' });
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: backupCodes,
          twoFactorVerifiedAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        message: '2FA enabled successfully',
        backupCodes,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error verifying 2FA:', error);
      return reply.code(500).send({ error: 'Failed to verify 2FA' });
    }
  });

  // Disable 2FA
  fastify.post('/auth/2fa/disable', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const body = disableTwoFactorSchema.parse(request.body);

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
          twoFactorSecret: true,
          twoFactorEnabled: true,
        },
      });

      if (!user || !user.passwordHash) {
        return reply.code(404).send({ error: 'User not found' });
      }

      if (!user.twoFactorEnabled) {
        return reply.code(400).send({ error: '2FA is not enabled' });
      }

      // Verify password
      const bcrypt = await import('bcrypt');
      const validPassword = await bcrypt.compare(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid password' });
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: body.token,
        window: 2,
      });

      if (!verified) {
        return reply.code(400).send({ error: 'Invalid verification code' });
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
          twoFactorVerifiedAt: null,
        },
      });

      return reply.send({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error disabling 2FA:', error);
      return reply.code(500).send({ error: 'Failed to disable 2FA' });
    }
  });

  // Verify 2FA token during login
  fastify.post('/auth/2fa/verify-login', async (request, reply) => {
    try {
      const body = z.object({
        email: z.string().email(),
        token: z.string().length(6),
      }).parse(request.body);

      // Get user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planTier: true,
          twoFactorSecret: true,
          twoFactorEnabled: true,
          twoFactorBackupCodes: true,
        },
      });

      if (!user || !user.twoFactorEnabled) {
        return reply.code(400).send({ error: 'Invalid request' });
      }

      // Check if it's a backup code
      const isBackupCode = user.twoFactorBackupCodes.includes(body.token);

      if (isBackupCode) {
        // Remove used backup code
        const updatedBackupCodes = user.twoFactorBackupCodes.filter(
          code => code !== body.token
        );

        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: updatedBackupCodes },
        });
      } else {
        // Verify TOTP token
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret!,
          encoding: 'base32',
          token: body.token,
          window: 2,
        });

        if (!verified) {
          return reply.code(400).send({ error: 'Invalid verification code' });
        }
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          planTier: user.planTier,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error verifying 2FA login:', error);
      return reply.code(500).send({ error: 'Failed to verify 2FA' });
    }
  });

  // Get 2FA status
  fastify.get('/auth/2fa/status', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: true,
        },
      });

      return reply.send({
        enabled: user?.twoFactorEnabled || false,
        verifiedAt: user?.twoFactorVerifiedAt || null,
      });
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      return reply.code(500).send({ error: 'Failed to get 2FA status' });
    }
  });
}
