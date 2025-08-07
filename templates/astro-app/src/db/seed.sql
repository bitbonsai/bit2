-- Sample users
INSERT OR IGNORE INTO users (name, email) VALUES 
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com');

-- Sample posts
INSERT OR IGNORE INTO posts (title, content, user_id) VALUES 
  ('Hello World!', 'This is my first post using bit2 with Astro and libSQL!', 1),
  ('Getting Started', 'libSQL makes it easy to work with SQLite in modern web apps.', 2);