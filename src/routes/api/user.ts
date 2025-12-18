import {eq} from 'drizzle-orm';
import {Hono} from 'hono';

import {db} from '../../database/db';
import {recoveryCodeTable, userTable} from '../../database/schema';
import hashPassword from '../../utils/hash-password';
import {verifyPassword} from '../../utils/verify-password';

const app = new Hono();

app.get('/recovery-codes', async (c) => {
  console.log('recovery codes');
  const jwtPayload = c.get('jwtPayload');

  const recoveryCodes = await db.query.recoveryCodeTable.findMany({
    where: eq(recoveryCodeTable.userId, jwtPayload.id),
  });

  if (!recoveryCodes) return c.json({success: false, recoveryCodes: null});

  return c.json({success: true, recoveryCodes});
});

app.patch('/name', async (c) => {
  try {
    const {firstName, lastName} = await c.req.json();
    const jwtPayload = c.get('jwtPayload');

    if (!firstName && !lastName) {
      return c.json(
          {success: false, error: 'At least one name field is required!'}, 400);
    }

    const updateData: {firstName?: string; lastName?: string} = {};
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0) {
        return c.json(
            {success: false, error: 'First name must be a non-empty string!'},
            400);
      }
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0) {
        return c.json(
            {success: false, error: 'Last name must be a non-empty string!'},
            400);
      }
      updateData.lastName = lastName.trim();
    }

    await db.update(userTable)
        .set(updateData)
        .where(eq(userTable.id, jwtPayload.id));

    return c.json({success: true}, 200);
  } catch (error) {
    console.log('Update name error:', error);
    return c.json({success: false, error: 'Internal server error'}, 500);
  }
});

app.patch('/username', async (c) => {
  console.log('update username');
  try {
    const {username} = await c.req.json();
    const jwtPayload = c.get('jwtPayload');

    if (!username || typeof username !== 'string' ||
        username.trim().length === 0) {
      return c.json(
          {success: false, error: 'Username must be a non-empty string!'}, 400);
    }

    const trimmedUsername = username.trim();

    // Check if username already exists (excluding current user)
    const existingUser = await db.query.userTable.findFirst({
      where: eq(userTable.username, trimmedUsername),
    });

    if (existingUser && existingUser.id !== jwtPayload.id) {
      return c.json({success: false, error: 'Username already exists!'}, 409);
    }

    // Check if user is trying to set the same username
    if (existingUser && existingUser.id === jwtPayload.id) {
      return c.json({success: true}, 200);
    }

    await db.update(userTable)
        .set({username: trimmedUsername})
        .where(eq(userTable.id, jwtPayload.id));

    return c.json({success: true}, 200);
  } catch (error) {
    console.log('Update username error:', error);
    return c.json({success: false, error: 'Internal server error'}, 500);
  }
});

app.patch('/password', async (c) => {
  try {
    const {currentPassword, newPassword} = await c.req.json();
    const jwtPayload = c.get('jwtPayload');

    if (!currentPassword || !newPassword) {
      return c.json(
          {
            success: false,
            error: 'Current password and new password are required!'
          },
          400);
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return c.json(
          {success: false, error: 'New password cannot be empty!'}, 400);
    }

    // Get current user to verify current password
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, jwtPayload.id),
    });

    if (!user) {
      return c.json({success: false, error: 'User not found!'}, 404);
    }

    // Verify current password
    const verified = await verifyPassword(currentPassword, user.password);

    if (!verified) {
      return c.json(
          {success: false, error: 'Current password is incorrect!'}, 401);
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);

    await db.update(userTable)
        .set({password: hashedPassword})
        .where(eq(userTable.id, jwtPayload.id));

    return c.json({success: true}, 200);
  } catch (error) {
    console.log('Update password error:', error);
    return c.json({success: false, error: 'Internal server error'}, 500);
  }
});

export default app;
