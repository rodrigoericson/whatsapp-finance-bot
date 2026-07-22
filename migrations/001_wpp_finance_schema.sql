CREATE SCHEMA IF NOT EXISTS wpp_finance;

CREATE TABLE IF NOT EXISTS wpp_finance.tbl_usuario (
    cn_usuario BIGSERIAL PRIMARY KEY,
    nr_telefone VARCHAR(32) NOT NULL UNIQUE,
    nm_apelido VARCHAR(80) NOT NULL,
    nm_pushname VARCHAR(120),
    fl_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    dt_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dt_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wpp_finance.tbl_lancamento (
    cn_lancamento BIGSERIAL PRIMARY KEY,
    cn_usuario BIGINT NOT NULL REFERENCES wpp_finance.tbl_usuario(cn_usuario) ON DELETE CASCADE,
    ds_descricao VARCHAR(255) NOT NULL,
    ds_categoria VARCHAR(60),
    ds_forma_pagamento VARCHAR(40),
    ds_mensagem_original TEXT NOT NULL,
    ds_grupo_jid VARCHAR(80) NOT NULL,
    nr_mensagem_wa_id VARCHAR(140),
    nr_mes_referencia CHAR(7) NOT NULL,
    vl_valor NUMERIC(12,2) NOT NULL CHECK (vl_valor > 0),
    fl_estornado BOOLEAN NOT NULL DEFAULT FALSE,
    dt_lancamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dt_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dt_estorno TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tbl_lancamento_mensagem_wa
    ON wpp_finance.tbl_lancamento (nr_mensagem_wa_id)
    WHERE nr_mensagem_wa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tbl_lancamento_usuario_mes
    ON wpp_finance.tbl_lancamento (cn_usuario, nr_mes_referencia);

CREATE INDEX IF NOT EXISTS ix_tbl_lancamento_grupo_mes
    ON wpp_finance.tbl_lancamento (ds_grupo_jid, nr_mes_referencia);

CREATE OR REPLACE FUNCTION wpp_finance.fn_touch_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_atualizacao := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tbl_usuario_touch ON wpp_finance.tbl_usuario;

CREATE TRIGGER trg_tbl_usuario_touch
    BEFORE UPDATE ON wpp_finance.tbl_usuario
    FOR EACH ROW EXECUTE FUNCTION wpp_finance.fn_touch_atualizacao();
