CREATE TABLE members (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    discord_username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,

    name TEXT NOT NULL,
    cabinet TEXT NOT NULL,
    event_type TEXT,

    description TEXT,
    location TEXT NOT NULL,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    points INTEGER NOT NULL DEFAULT 1 CHECK (points >= 0),

    attendance_code CHAR(5) UNIQUE NOT NULL,
    code_expires_at TIMESTAMPTZ NOT NULL,

    created_by_discord_id TEXT NOT NULL,

    google_calendar_event_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (end_time > start_time)
);


CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,

    member_id BIGINT NOT NULL
        REFERENCES members(id)
        ON DELETE CASCADE,

    event_id BIGINT NOT NULL
        REFERENCES events(id)
        ON DELETE CASCADE,

    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(member_id, event_id)
);


CREATE INDEX idx_members_discord_id
ON members(discord_id);


CREATE INDEX idx_events_attendance_code
ON events(attendance_code);


CREATE INDEX idx_events_start_time
ON events(start_time);


CREATE INDEX idx_attendance_member
ON attendance(member_id);


CREATE INDEX idx_attendance_event
ON attendance(event_id);


ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;


GRANT ALL ON TABLE members TO service_role;
GRANT ALL ON TABLE events TO service_role;
GRANT ALL ON TABLE attendance TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;