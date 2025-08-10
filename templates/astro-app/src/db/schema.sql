-- Quotes table for Stoic wisdom
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  source TEXT,
  category TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(author);
CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);