ALTER TABLE wpp_finance.tbl_lancamento
ADD COLUMN IF NOT EXISTS dt_correcao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ds_mensagem_correcao TEXT;
