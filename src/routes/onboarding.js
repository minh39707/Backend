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
      .upsert(
        {
          user_id: userId,
          name: habit_name,
          type: habit_type ?? 'preset',
          category: 'good',
          life_area: life_area ?? null,
          time_period: time_period ?? 'morning',
          time_exact: time_exact ?? '07:00',
          frequency: frequency ?? 'everyday',
          specific_days: specific_days ?? [],
        },
        { onConflict: 'user_id,name' }
      )
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
