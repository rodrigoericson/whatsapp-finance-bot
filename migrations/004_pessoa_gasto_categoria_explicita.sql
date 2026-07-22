ALTER TABLE wpp_finance.tbl_lancamento
ADD COLUMN IF NOT EXISTS cn_pessoa_gasto BIGINT REFERENCES wpp_finance.tbl_usuario(cn_usuario) ON DELETE SET NULL;

UPDATE wpp_finance.tbl_lancamento
SET cn_pessoa_gasto = cn_usuario
WHERE cn_pessoa_gasto IS NULL;

ALTER TABLE wpp_finance.tbl_lancamento
ALTER COLUMN cn_pessoa_gasto SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tbl_lancamento_pessoa_mes
ON wpp_finance.tbl_lancamento (cn_pessoa_gasto, nr_mes_referencia);
