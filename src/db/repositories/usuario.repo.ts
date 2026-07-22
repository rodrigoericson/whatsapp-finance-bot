import { pool } from '../pool.js';

export type Usuario = {
  cnUsuario: number;
  nrTelefone: string;
  nmApelido: string;
  nmPushname: string | null;
};

function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    cnUsuario: Number(row.cn_usuario),
    nrTelefone: String(row.nr_telefone),
    nmApelido: String(row.nm_apelido),
    nmPushname: row.nm_pushname === null ? null : String(row.nm_pushname),
  };
}

export async function upsertUsuario(input: {
  nrTelefone: string;
  nmApelido: string;
  nmPushname?: string | null;
}): Promise<Usuario> {
  const result = await pool.query(
    `
      INSERT INTO wpp_finance.tbl_usuario (nr_telefone, nm_apelido, nm_pushname)
      VALUES ($1, $2, $3)
      ON CONFLICT (nr_telefone)
      DO UPDATE SET
        nm_apelido = EXCLUDED.nm_apelido,
        nm_pushname = COALESCE(EXCLUDED.nm_pushname, wpp_finance.tbl_usuario.nm_pushname),
        fl_ativo = TRUE
      RETURNING cn_usuario, nr_telefone, nm_apelido, nm_pushname
    `,
    [input.nrTelefone, input.nmApelido, input.nmPushname ?? null],
  );

  return mapUsuario(result.rows[0]);
}
