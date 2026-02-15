-- Add SSH settings for remote Asterisk config management (like ARI/AMI)
ALTER TABLE asterisk_settings
  ADD COLUMN ssh_host VARCHAR(255) NULL,
  ADD COLUMN ssh_port SMALLINT UNSIGNED NULL DEFAULT 22,
  ADD COLUMN ssh_user VARCHAR(128) NULL,
  ADD COLUMN ssh_pass VARCHAR(256) NULL;
