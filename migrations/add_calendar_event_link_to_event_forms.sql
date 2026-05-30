ALTER TABLE event_forms
ADD COLUMN google_calendar_event_link TEXT DEFAULT NULL
COMMENT 'Full Google Calendar event URL; parsed on submission to add attendee';
