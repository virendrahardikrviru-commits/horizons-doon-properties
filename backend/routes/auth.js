import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// ✅ Initialize Google OAuth2 Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// ✅ Google OAuth login with credential (JWT)
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ 
      success: false, 
      error: 'No credential provided' 
    });
  }

  try {
    console.log('🔐 Verifying Google credential...');

    // ✅ Verify the JWT credential
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    console.log(`✅ Google user verified: ${email}`);

    // ✅ Check if user exists in database
    let result = await query(
      'SELECT * FROM users WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );

    let user;

    if (result.rows.length === 0) {
      // ✅ Create new user
      console.log(`🆕 Creating new user: ${email}`);
      const avatarInitial = name ? name.charAt(0).toUpperCase() : 'U';
      
      const insertResult = await query(
        `INSERT INTO users (google_id, email, name, avatar_initial, picture, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) 
         RETURNING id, google_id, email, name, avatar_initial, picture`,
        [googleId, email, name, avatarInitial, picture]
      );
      
      user = insertResult.rows[0];
    } else {
      // ✅ Update existing user
      user = result.rows[0];
      
      // Update google_id if missing
      if (!user.google_id) {
        await query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
        user.google_id = googleId;
      }
      
      // Update name/picture if changed
      if (user.name !== name || user.picture !== picture) {
        await query(
          'UPDATE users SET name = $1, picture = $2 WHERE id = $3',
          [name, picture, user.id]
        );
        user.name = name;
        user.picture = picture;
      }
    }

    // ✅ Generate JWT token for your app
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        google_id: user.google_id 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Login successful for: ${email}`);

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarInitial: user.avatar_initial || user.name?.charAt(0) || 'U',
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('❌ Google auth error:', error);
    
    if (error.message.includes('idToken')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Google credential. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed. Please try again.'
    });
  }
});

export default router;