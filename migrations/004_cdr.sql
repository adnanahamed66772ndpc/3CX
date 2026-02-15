-- CDR: call detail records (from AMI Cdr events or Asterisk CDR)
CREATE TABLE IF NOT EXISTS cdr (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uniqueid          VARCHAR(64) NOT NULL,
  calldate          DATETIME(3) NOT NULL,
  src               VARCHAR(80) NULL,
  dst               VARCHAR(80) NULL,
  duration          INT UNSIGNED NOT NULL DEFAULT 0,
  billsec           INT UNSIGNED NOT NULL DEFAULT 0,
  disposition       VARCHAR(32) NULL,
  channel           VARCHAR(255) NULL,
  dstchannel        VARCHAR(255) NULL,
  created_at        DATETIME(3) NOT NULL,

  UNIQUE KEY uq_cdr_uniqueid (uniqueid),
  KEY idx_calldate (calldate),
  KEY idx_src_dst (src, dst)
) ENGINE=InnoDB;
