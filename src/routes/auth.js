const express = require('express');
const { supabase } = require('../supabase');

const router = express.Router();

// POST /api/auth/email/sign-up
router.post('/email/sign-up', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? email.split('@')[0] },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Create profile
    const displayName = name ?? email.split('@')[0];
    await supabase.from('users').upsert({
      user_id: data.user.id,
      email: email,
      username: displayName,
    });

    // Create RPG character to initialize user level/hp
    await supabase.from('characters').insert({
      user_id: data.user.id,
      name: displayName,
      class: 'Novice',
      level: 1,
      current_hp: 100,
      max_hp: 100,
      current_exp: 0,
      exp_to_next_level: 100,
      power: 10,
      gold_coins: 0,
    });

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: displayName,
      },
    });
  } catch (err) {
    console.error('Sign-up error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/email/sign-in
router.post('/email/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: error.message });
    }

    // Fetch user details for frontend payload
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('user_id', data.user.id)
      .single();

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.username ?? email.split('@')[0],
      },
    });
  } catch (err) {
    console.error('Sign-in error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/google (placeholder — requires frontend OAuth token)
router.post('/google', async (req, res) => {
  return res.status(501).json({
    message: 'Google sign-in requires a valid OAuth token from the mobile app. This will be implemented when Google OAuth is configured in Supabase.',
  });
});

module.exports = router;
