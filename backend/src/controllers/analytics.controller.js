const Report = require('../models/Report');
const PhoneNumber = require('../models/PhoneNumber');
const User = require('../models/User');

const getWeeklyStats = async (req, res) => {
  try {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date  = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [spam, ham] = await Promise.all([
        Report.countDocuments({
          createdAt:       { $gte: date, $lt: nextDate },
          aiClassification: 'spam',
        }),
        Report.countDocuments({
          createdAt:       { $gte: date, $lt: nextDate },
          aiClassification: { $in: ['ham', null] },
        }),
      ]);

      days.push({
        day:  dayNames[date.getDay()],
        date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        spam,
        ham,
      });
    }

    res.status(200).json({ success: true, data: days });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWeeklyStats };