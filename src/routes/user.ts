import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export async function userRoutes(app: FastifyInstance) {
  // GET /api/v1/user/profile - Get current user profile
  app.get('/user/profile', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          phoneNumber: true,
          address: true,
          city: true,
          country: true,
          role: true,
          planTier: true,
          isActive: true,
          lastLogin: true,
          storageUsedMB: true,
          totalQueries: true,
          createdAt: true,
          updatedAt: true,
          barNumber: true,
          lawFirm: true,
          specialization: true,
          licenseState: true,
          bio: true,
          language: true,
          timezone: true,
          theme: true,
          emailNotifications: true,
          marketingEmails: true,
          provider: true,
          twoFactorEnabled: true,
          twoFactorVerifiedAt: true,
        }
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return { user };
    } catch (error) {
      console.error('Get profile error:', error);
      return reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // PATCH /api/v1/user/profile - Update user profile
  app.patch('/user/profile', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const body = request.body as any;

      const updateData: any = {};
      const allowedFields = [
        'name', 'phoneNumber', 'address', 'city', 'country',
        'barNumber', 'lawFirm', 'specialization', 'licenseState', 'bio',
        'language', 'timezone', 'theme', 'emailNotifications', 'marketingEmails'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          phoneNumber: true,
          address: true,
          city: true,
          country: true,
          barNumber: true,
          lawFirm: true,
          specialization: true,
          licenseState: true,
          bio: true,
          language: true,
          timezone: true,
          theme: true,
          emailNotifications: true,
          marketingEmails: true,
          updatedAt: true,
        }
      });

      return { user: updatedUser, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update profile error:', error);
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // POST /api/v1/user/avatar - Upload avatar
  app.post('/user/avatar', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
        });
      }

      // Create uploads directory
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(data.filename);
      const filename = `avatar-${uniqueSuffix}${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      const buffer = await data.toBuffer();
      await fs.writeFile(filepath, buffer);

      const avatarUrl = `/uploads/avatars/${filename}`;

      // Get old avatar to delete it
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      // Update user avatar
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: {
          id: true,
          avatarUrl: true,
        }
      });

      // Delete old avatar if exists
      if (user?.avatarUrl) {
        try {
          const oldAvatarPath = path.join(process.cwd(), user.avatarUrl);
          await fs.unlink(oldAvatarPath);
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }

      return {
        user: updatedUser,
        message: 'Avatar uploaded successfully'
      };
    } catch (error) {
      console.error('Upload avatar error:', error);
      return reply.code(500).send({ error: 'Failed to upload avatar' });
    }
  });

  // DELETE /api/v1/user/avatar - Delete avatar
  app.delete('/user/avatar', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      if (!user?.avatarUrl) {
        return reply.code(404).send({ error: 'No avatar to delete' });
      }

      // Delete avatar file
      try {
        const avatarPath = path.join(process.cwd(), user.avatarUrl);
        await fs.unlink(avatarPath);
      } catch (err) {
        console.error('Error deleting avatar file:', err);
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null }
      });

      return { message: 'Avatar deleted successfully' };
    } catch (error) {
      console.error('Delete avatar error:', error);
      return reply.code(500).send({ error: 'Failed to delete avatar' });
    }
  });
}
