// All valid categories that should be available for filtering
export const VALID_CATEGORIES = [
  'positive',
  'negative',
  'interrogative',
  'suggestion',
  'off_topic',
];

// Map category internal names to display names
export const CATEGORY_DISPLAY_NAMES = {
  'positive': 'Positive',
  'negative': 'Negative',
  'interrogative': 'Interrogative',
  'suggestion': 'Suggestion',
  'off_topic': 'Off Topic',
};

// All valid platforms
export const VALID_PLATFORMS = ['facebook', 'instagram', 'all'];

// All valid statuses
export const VALID_STATUSES = ['open', 'resolved', 'breached'];

// Time range mapping
export const TIME_RANGE_MAP = {
  'Today': 'today',
  'This Week': 'this_week',
  'This Month': 'this_month',
  'Last 3 Months': 'last_month',
};
