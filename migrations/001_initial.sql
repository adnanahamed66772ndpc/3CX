-- calls: one row per logical call in your application
CREATE TABLE IF NOT EXISTS calls (
  call_id              CHAR(36) PRIMARY KEY,
  status               VARCHAR(32) NOT NULL,
  direction            ENUM('inbound','outbound','internal','unknown') DEFAULT 'unknown',

  asterisk_uniqueid    VARCHAR(64) NULL,
  asterisk_linkedid    VARCHAR(64) NULL,
  ami_action_id        VARCHAR(128) NULL,
  ari_channel_a_id     VARCHAR(64) NULL,
  ari_channel_b_id     VARCHAR(64) NULL,
  bridge_id            VARCHAR(64) NULL,

  a_endpoint           VARCHAR(255) NULL,
  b_endpoint           VARCHAR(255) NULL,
  caller_id            VARCHAR(255) NULL,

  started_at           DATETIME(3) NULL,
  answered_at          DATETIME(3) NULL,
  ended_at             DATETIME(3) NULL,

  hangup_cause         INT NULL,
  hangup_cause_txt     VARCHAR(64) NULL,

  created_at           DATETIME(3) NOT NULL,
  updated_at           DATETIME(3) NOT NULL,

  UNIQUE KEY uq_ami_action_id (ami_action_id),
  KEY idx_started_at (started_at),
  KEY idx_status_started (status, started_at),
  KEY idx_uniqueid (asterisk_uniqueid),
  KEY idx_linkedid (asterisk_linkedid)
) ENGINE=InnoDB;

-- call_events: append-only time series
CREATE TABLE IF NOT EXISTS call_events (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  call_id             CHAR(36) NOT NULL,
  source              ENUM('ari','ami','app') NOT NULL,
  event_type          VARCHAR(64) NOT NULL,
  event_time          DATETIME(3) NOT NULL,
  payload_json        JSON NOT NULL,

  KEY idx_call_time (call_id, event_time),
  KEY idx_type_time (event_type, event_time),

  CONSTRAINT fk_call_events_call FOREIGN KEY (call_id) REFERENCES calls(call_id)
) ENGINE=InnoDB;
