ALTER TABLE wpp_finance.tbl_lancamento
ADD COLUMN IF NOT EXISTS cn_parcela_grupo BIGINT,
ADD COLUMN IF NOT EXISTS nr_parcela SMALLINT,
ADD COLUMN IF NOT EXISTS qt_parcelas_total SMALLINT,
ADD COLUMN IF NOT EXISTS vl_valor_total_compra NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS ix_tbl_lancamento_parcela_grupo
ON wpp_finance.tbl_lancamento (cn_parcela_grupo)
WHERE cn_parcela_grupo IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_tbl_lancamento_parcela_consistente'
          AND conrelid = 'wpp_finance.tbl_lancamento'::regclass
    ) THEN
        ALTER TABLE wpp_finance.tbl_lancamento
        ADD CONSTRAINT ck_tbl_lancamento_parcela_consistente
        CHECK (
            (cn_parcela_grupo IS NULL AND nr_parcela IS NULL AND qt_parcelas_total IS NULL AND vl_valor_total_compra IS NULL)
            OR
            (cn_parcela_grupo IS NOT NULL AND nr_parcela IS NOT NULL AND qt_parcelas_total IS NOT NULL AND vl_valor_total_compra IS NOT NULL)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_tbl_lancamento_nr_parcela'
          AND conrelid = 'wpp_finance.tbl_lancamento'::regclass
    ) THEN
        ALTER TABLE wpp_finance.tbl_lancamento
        ADD CONSTRAINT ck_tbl_lancamento_nr_parcela
        CHECK (nr_parcela IS NULL OR (nr_parcela >= 1 AND nr_parcela <= qt_parcelas_total));
    END IF;
END $$;
