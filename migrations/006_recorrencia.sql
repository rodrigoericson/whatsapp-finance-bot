CREATE TABLE IF NOT EXISTS wpp_finance.tbl_recorrencia (
    cn_recorrencia     BIGSERIAL PRIMARY KEY,
    cn_usuario         BIGINT NOT NULL REFERENCES wpp_finance.tbl_usuario(cn_usuario) ON DELETE RESTRICT,
    cn_pessoa_gasto    BIGINT NOT NULL REFERENCES wpp_finance.tbl_usuario(cn_usuario) ON DELETE RESTRICT,
    ds_descricao       VARCHAR(255) NOT NULL,
    ds_categoria       VARCHAR(60),
    ds_forma_pagamento VARCHAR(40),
    vl_valor           NUMERIC(12,2) NOT NULL CHECK (vl_valor > 0),
    nr_dia_cobranca    SMALLINT NOT NULL CHECK (nr_dia_cobranca BETWEEN 1 AND 28),
    fl_ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    dt_inicio          DATE NOT NULL DEFAULT CURRENT_DATE,
    dt_fim             DATE,
    ds_grupo_jid       VARCHAR(80) NOT NULL,
    ds_mensagem_original TEXT NOT NULL,
    dt_criacao         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dt_atualizacao     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_tbl_recorrencia_dt_fim CHECK (dt_fim IS NULL OR dt_fim >= dt_inicio)
);

CREATE INDEX IF NOT EXISTS ix_tbl_recorrencia_grupo_ativo
    ON wpp_finance.tbl_recorrencia (ds_grupo_jid) WHERE fl_ativo = TRUE;

CREATE INDEX IF NOT EXISTS ix_tbl_recorrencia_usuario
    ON wpp_finance.tbl_recorrencia (cn_usuario);

DROP TRIGGER IF EXISTS trg_tbl_recorrencia_touch ON wpp_finance.tbl_recorrencia;

CREATE TRIGGER trg_tbl_recorrencia_touch
    BEFORE UPDATE ON wpp_finance.tbl_recorrencia
    FOR EACH ROW EXECUTE FUNCTION wpp_finance.fn_touch_atualizacao();
