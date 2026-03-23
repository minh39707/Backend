const express = require('express');
const { supabase } = require('../supabase');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

function buildMonthLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function buildCalendarDays(habits, logs) {
  const dayLabels = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const shortLabels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  // Build a set of dates that have completed logs
  const completedDates = new Set(
    logs.map((log) => new Date(log.completed_at).toDateString())
  );

  return dayLabels.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const isSelected = date.toDateString() === now.toDateString();
    const isDone = completedDates.has(date.toDateString());

    return {
      label: shortLabels[day],
      date: date.getDate(),
      status: isDone ? 'done' : isSelected ? 'warning' : 'empty',
      isSelected,
    };
  });
}

// GET /api/dashboard
router.get('/', requireUser, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user habits
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    // Get recent logs (this week)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: recentLogs } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', sevenDaysAgo.toISOString());

    // Get total logs for stats
    const { count: totalLogs } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const weekLogs = recentLogs?.length ?? 0;
    const exp = Math.min(100, (totalLogs ?? 0) * 5);
    const streak = weekLogs;
    const hp = Math.min(100, 50 + streak * 7);

    const stats = [
      { label: 'HP', value: hp, max: 100, color: '#EF4444', icon: 'heart' },
      { label: 'EXP', value: exp, max: 100, color: '#3B82F6', icon: 'flash' },
      { label: 'Streaks', value: streak, max: 7, color: '#F59E0B', icon: 'flame' },
    ];

    // Quick actions from habits
    const quickActions = (habits ?? []).map((habit) => ({
      id: habit.id,
      title: habit.name,
      description: `At ${habit.time_exact}`,
      color: '#3B82F6',
      tintColor: '#EDF5FF',
      icon: habit.name === 'drink_water' ? 'water' : habit.name === 'walk' ? 'run' : 'read',
    }));

    // Good habits list
    const goodHabits = (habits ?? [])
      .filter((h) => h.category === 'good')
      .map((habit) => ({
        id: habit.id,
        title: habit.name,
        progressLabel: habit.frequency,
        actionLabel: 'Ready today',
        icon: 'book',
        iconColor: '#3B82F6',
        iconBackground: '#EEF5FF',
        actionTone: 'primary',
      }));

    const todayProgress = totalLogs > 0 ? Math.min(1, weekLogs / 7) : 0;

    return res.json({
      todayProgress,
      monthLabel: buildMonthLabel(),
      stats,
      quickActions,
      calendarDays: buildCalendarDays(habits ?? [], recentLogs ?? []),
      goodHabits,
      badHabits: [],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
