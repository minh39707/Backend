const express = require('express');
const { supabase } = require('../supabase');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

// POST /api/onboarding/sync
router.post('/sync', requireUser, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      habit_name,
      habit_type,
      life_area,
      life_area_label,
      time_period,
      time_exact,
      frequency,
      specific_days,
    } = req.body;

    if (!habit_name) {
      return res.status(400).json({ message: 'Habit name is required.' });
    }

    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title: habit_name,
        description: `Created during onboarding. Area: ${life_area_label ?? 'General'}. Scheduled: ${time_period ?? 'morning'} at ${time_exact ?? '07:00'}`,
        habit_type: habit_type === 'bad' ? 'negative' : 'positive',
        tracking_method: 'boolean', // ENUM allows: quantity, time, boolean, custom
        frequency_type: 'daily',    // ENUM allows: daily, weekly, custom
        frequency_days: specific_days ?? [],
        hp_reward: 10,
        exp_reward: 20,
        hp_penalty: 15,
        streak_bonus_exp: 5,
        target_value: 1,
        target_unit: 'times',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Onboarding sync error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.json({ habit: data });
  } catch (err) {
    console.error('Onboarding sync error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
