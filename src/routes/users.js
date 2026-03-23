const express = require('express');
const { supabase } = require('../supabase');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me
router.get('/me', requireUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Calculate level from habit logs
    const { count: totalLogs } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    const level = Math.max(1, Math.floor((totalLogs ?? 0) / 10) + 1);
    const levelProgress = ((totalLogs ?? 0) % 10) * 10;

    return res.json({
      name: profile.name,
      level,
      levelProgress,
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/me/stats
router.get('/me/stats', requireUser, async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Count total logs (EXP)
    const { count: totalLogs } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    // Count logs in the last 7 days (streak approximation)
    const { count: weekLogs } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('completed_at', sevenDaysAgo.toISOString());

    const exp = Math.min(100, (totalLogs ?? 0) * 5);
    const streak = weekLogs ?? 0;
    const hp = Math.min(100, 50 + streak * 7);

    return res.json([
      { label: 'HP', value: hp, max: 100, color: '#EF4444', icon: 'heart' },
      { label: 'EXP', value: exp, max: 100, color: '#3B82F6', icon: 'flash' },
      { label: 'Streaks', value: streak, max: 7, color: '#F59E0B', icon: 'flame' },
    ]);
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
