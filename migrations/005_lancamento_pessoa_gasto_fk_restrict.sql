DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'wpp_finance'
      AND t.relname = 'tbl_lancamento'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%cn_pessoa_gasto%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE wpp_finance.tbl_lancamento DROP CONSTRAINT %I', constraint_name);
    END IF;

    ALTER TABLE wpp_finance.tbl_lancamento
    ADD CONSTRAINT fk_tbl_lancamento_pessoa_gasto
    FOREIGN KEY (cn_pessoa_gasto)
    REFERENCES wpp_finance.tbl_usuario(cn_usuario)
    ON DELETE RESTRICT;
END $$;
