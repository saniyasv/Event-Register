-- ============================================================
-- Event Registration System – Database Schema
-- DBMS: SQLite
-- ============================================================

-- ─── Students Table ─────────────────────────────────────────
-- Stores student information for event registration.
CREATE TABLE IF NOT EXISTS Students (
    student_id  INTEGER       PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(100)  NOT NULL,
    department  VARCHAR(50),
    email       VARCHAR(100),
    phone       VARCHAR(15)
);

-- ─── Events Table ───────────────────────────────────────────
-- Stores event details such as name, date, venue, and organizer.
CREATE TABLE IF NOT EXISTS Events (
    event_id    INTEGER       PRIMARY KEY AUTOINCREMENT,
    event_name  VARCHAR(100)  NOT NULL,
    event_date  DATE,
    venue       VARCHAR(100),
    organizer   VARCHAR(100)
);

-- ─── Registrations Table ────────────────────────────────────
-- Junction table linking students to events (many-to-many).
-- Cascade deletes ensure referential integrity.
CREATE TABLE IF NOT EXISTS Registrations (
    registration_id    INTEGER  PRIMARY KEY AUTOINCREMENT,
    student_id         INTEGER  NOT NULL,
    event_id           INTEGER  NOT NULL,
    registration_date  DATE,
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id)   REFERENCES Events(event_id)     ON DELETE CASCADE
);
