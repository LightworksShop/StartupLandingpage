CREATE TABLE marketing_session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX marketing_session_expire ON marketing_session (expire);
