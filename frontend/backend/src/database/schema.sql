-- Esquema de referencia. TypeORM lo genera solo con DB_SYNC=true;
-- este archivo sirve para revisarlo o crearlo a mano en producción.

CREATE DATABASE IF NOT EXISTS licitaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE licitaciones;

CREATE TABLE periods (
  id            VARCHAR(20)  NOT NULL PRIMARY KEY,
  year          INT          NOT NULL UNIQUE,
  status        ENUM('Abierto','Cerrado','Planeado') NOT NULL DEFAULT 'Planeado',
  startDate     DATE         NOT NULL,
  endDate       DATE         NOT NULL,
  openedDate    DATE         NULL,
  closedDate    DATE         NULL
) ENGINE=InnoDB;

CREATE TABLE holidays (
  date        DATE         NOT NULL PRIMARY KEY,
  description VARCHAR(160) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE warehouses (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  description TEXT         NULL
) ENGINE=InnoDB;

CREATE TABLE dictamenes (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  periodId        VARCHAR(20)  NOT NULL,
  folio           VARCHAR(60)  NOT NULL,
  date            DATE         NOT NULL,
  requester       VARCHAR(200) NOT NULL,
  area            VARCHAR(200) NOT NULL,
  object          TEXT         NOT NULL,
  estimatedAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
  procedureType   VARCHAR(80)  NOT NULL DEFAULT 'Pendiente de definición',
  status          ENUM('En elaboración','Emitido','Enviado a DRM','Procedimiento iniciado','Concluido') NOT NULL DEFAULT 'En elaboración',
  fileName        VARCHAR(260) NOT NULL DEFAULT '',
  UNIQUE KEY uq_dictamen_folio (periodId, folio),
  CONSTRAINT fk_dictamen_period FOREIGN KEY (periodId) REFERENCES periods(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE licitaciones (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  periodId      VARCHAR(20)  NOT NULL,
  dictamenId    CHAR(36)     NULL,
  type          VARCHAR(80)  NOT NULL DEFAULT 'Licitación pública nacional',
  number        VARCHAR(120) NOT NULL,
  object        TEXT         NOT NULL,
  area          VARCHAR(220) NOT NULL DEFAULT '',
  fallDate      DATE         NULL,
  deliveryDays  INT          NOT NULL DEFAULT 20,
  dayType       ENUM('business','calendar') NOT NULL DEFAULT 'business',
  penaltyPct    DECIMAL(6,3) NOT NULL DEFAULT 0.100,
  deliveryPlace VARCHAR(260) NOT NULL DEFAULT '',
  UNIQUE KEY uq_licitacion_number (periodId, number),
  CONSTRAINT fk_licitacion_period FOREIGN KEY (periodId) REFERENCES periods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_licitacion_dictamen FOREIGN KEY (dictamenId) REFERENCES dictamenes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE partidas (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  licitacionId         CHAR(36)     NOT NULL,
  number               VARCHAR(40)  NOT NULL,
  grupo                VARCHAR(80)  NOT NULL DEFAULT '',
  description          VARCHAR(400) NOT NULL,
  result               ENUM('Adjudicada','Desierta','Pendiente') NOT NULL DEFAULT 'Adjudicada',
  quantity             INT          NOT NULL DEFAULT 1,
  unit                 ENUM('Pieza','Kit','Par','Combo','Servicio') NOT NULL DEFAULT 'Pieza',
  warehouseId          VARCHAR(40)  NULL,
  provider             VARCHAR(260) NOT NULL DEFAULT '',
  brand                VARCHAR(200) NOT NULL DEFAULT '',
  unitPrice            DECIMAL(14,2) NOT NULL DEFAULT 0,
  fallDate             DATE         NULL,
  contractNumber       VARCHAR(80)  NOT NULL DEFAULT '',
  contractDate         DATE         NULL,
  deliveryDate         DATE         NULL,
  performanceGuarantee ENUM('Pendiente','Entregada','No aplica') NOT NULL DEFAULT 'Pendiente',
  complianceStatus     ENUM('Pendiente','Cumplimiento','Incumplimiento','No aplica') NOT NULL DEFAULT 'Pendiente',
  warranty             VARCHAR(80)  NOT NULL DEFAULT '',
  notes                TEXT         NULL,
  attachments          JSON         NULL,
  UNIQUE KEY uq_partida (licitacionId, number, grupo),
  CONSTRAINT fk_partida_licitacion FOREIGN KEY (licitacionId) REFERENCES licitaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_partida_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE people (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  dependencyCode VARCHAR(10)  NOT NULL,
  area           VARCHAR(240) NOT NULL,
  UNIQUE KEY uq_person (name, dependencyCode)
) ENGINE=InnoDB;

CREATE TABLE memos (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  periodId     VARCHAR(20)  NOT NULL,
  licitacionId CHAR(36)     NULL,
  folio        VARCHAR(30)  NOT NULL,
  date         DATE         NOT NULL,
  recipient    VARCHAR(200) NOT NULL DEFAULT 'Martha Maldonado Vilchis',
  subject      VARCHAR(300) NOT NULL,
  status       ENUM('Borrador','Enviado','Atendido','Entregado','Cancelado') NOT NULL DEFAULT 'Enviado',
  UNIQUE KEY uq_memo_folio (periodId, folio),
  CONSTRAINT fk_memo_period FOREIGN KEY (periodId) REFERENCES periods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_memo_licitacion FOREIGN KEY (licitacionId) REFERENCES licitaciones(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE memo_allocations (
  id        CHAR(36) NOT NULL PRIMARY KEY,
  memoId    CHAR(36) NOT NULL,
  partidaId CHAR(36) NOT NULL,
  personId  CHAR(36) NOT NULL,
  quantity  INT      NOT NULL DEFAULT 1,
  CONSTRAINT fk_allocation_memo FOREIGN KEY (memoId) REFERENCES memos(id) ON DELETE CASCADE,
  CONSTRAINT fk_allocation_partida FOREIGN KEY (partidaId) REFERENCES partidas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocation_person FOREIGN KEY (personId) REFERENCES people(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Vista de existencias: cantidad comprometida y disponible por partida.
CREATE OR REPLACE VIEW partida_stock AS
SELECT
  p.id AS partidaId,
  p.quantity AS quantity,
  COALESCE(SUM(CASE WHEN m.status IN ('Enviado','Atendido','Entregado') THEN a.quantity ELSE 0 END), 0) AS committed,
  GREATEST(p.quantity - COALESCE(SUM(CASE WHEN m.status IN ('Enviado','Atendido','Entregado') THEN a.quantity ELSE 0 END), 0), 0) AS available
FROM partidas p
LEFT JOIN memo_allocations a ON a.partidaId = p.id
LEFT JOIN memos m ON m.id = a.memoId
GROUP BY p.id, p.quantity;
