-- asterisk_settings: ARI and AMI config from admin panel (overrides .env when set)
CREATE TABLE IF NOT EXISTS asterisk_settings (
  id              TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  ari_url         VARCHAR(512) NULL,
  ari_user        VARCHAR(128) NULL,
  ari_pass        VARCHAR(256) NULL,
  ari_app         VARCHAR(128) NULL,
  ami_host        VARCHAR(255) NULL,
  ami_port        SMALLINT UNSIGNED NULL,
  ami_user        VARCHAR(128) NULL,
  ami_pass        VARCHAR(256) NULL,
  updated_at      DATETIME(3) NULL,
  CONSTRAINT chk_single_row CHECK (id = 1)
) ENGINE=InnoDB;
