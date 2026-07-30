import { pool } from '../pool.js';

export type Recorrencia = {
  cnRecorrencia: number;
  cnUsuario: number;
  cnPessoaGasto: number;
  nmPessoaGasto: string;
  dsDescricao: string;
  dsCategoria: string | null;
  dsFormaPagamento: string | null;
  vlValor: string;
  nrDiaCobranca: number;
  flAtivo: boolean;
  dtInicio: string;
  dtFim: string | null;
  dsGrupoJid: string;
  dsMensagemOriginal: string;
};

function mapRecorrencia(row: Record<string, unknown>): Recorrencia {
  return {
    cnRecorrencia: Number(row.cn_recorrencia),
    cnUsuario: Number(row.cn_usuario),
    cnPessoaGasto: Number(row.cn_pessoa_gasto),
    nmPessoaGasto: String(row.nm_pessoa_gasto),
    dsDescricao: String(row.ds_descricao),
    dsCategoria: row.ds_categoria === null ? null : String(row.ds_categoria),
    dsFormaPagamento: row.ds_forma_pagamento === null ? null : String(row.ds_forma_pagamento),
    vlValor: String(row.vl_valor),
    nrDiaCobranca: Number(row.nr_dia_cobranca),
    flAtivo: Boolean(row.fl_ativo),
    dtInicio: String(row.dt_inicio),
    dtFim: row.dt_fim === null ? null : String(row.dt_fim),
    dsGrupoJid: String(row.ds_grupo_jid),
    dsMensagemOriginal: String(row.ds_mensagem_original),
  };
}

export async function inserirRecorrencia(input: {
  cnUsuario: number;
  cnPessoaGasto: number;
  dsDescricao: string;
  dsCategoria?: string | null;
  dsFormaPagamento?: string | null;
  vlValor: number;
  nrDiaCobranca: number;
  dsGrupoJid: string;
  dsMensagemOriginal: string;
}): Promise<Recorrencia> {
  const result = await pool.query(
    `
      INSERT INTO wpp_finance.tbl_recorrencia (
        cn_usuario, cn_pessoa_gasto, ds_descricao, ds_categoria, ds_forma_pagamento,
        vl_valor, nr_dia_cobranca, ds_grupo_jid, ds_mensagem_original
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *,
        (SELECT nm_apelido FROM wpp_finance.tbl_usuario WHERE cn_usuario = tbl_recorrencia.cn_pessoa_gasto) AS nm_pessoa_gasto
    `,
    [
      input.cnUsuario,
      input.cnPessoaGasto,
      input.dsDescricao,
      input.dsCategoria ?? null,
      input.dsFormaPagamento ?? null,
      input.vlValor,
      input.nrDiaCobranca,
      input.dsGrupoJid,
      input.dsMensagemOriginal,
    ],
  );

  return mapRecorrencia(result.rows[0]);
}

export async function buscarRecorrenciaPorId(input: {
  cnRecorrencia: number;
  cnUsuario: number;
  dsGrupoJid: string;
}): Promise<Recorrencia | null> {
  const result = await pool.query(
    `
      SELECT r.*, p.nm_apelido AS nm_pessoa_gasto
      FROM wpp_finance.tbl_recorrencia r
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = r.cn_pessoa_gasto
      WHERE r.cn_recorrencia = $1
        AND r.cn_usuario = $2
        AND r.ds_grupo_jid = $3
    `,
    [input.cnRecorrencia, input.cnUsuario, input.dsGrupoJid],
  );

  return (result.rowCount ?? 0) === 0 ? null : mapRecorrencia(result.rows[0]);
}

export async function listarRecorrenciasPorUsuario(input: {
  cnUsuario: number;
  dsGrupoJid: string;
}): Promise<Recorrencia[]> {
  const result = await pool.query(
    `
      SELECT r.*, p.nm_apelido AS nm_pessoa_gasto
      FROM wpp_finance.tbl_recorrencia r
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = r.cn_pessoa_gasto
      WHERE r.cn_usuario = $1
        AND r.ds_grupo_jid = $2
      ORDER BY r.fl_ativo DESC, r.ds_descricao
    `,
    [input.cnUsuario, input.dsGrupoJid],
  );

  return result.rows.map(mapRecorrencia);
}

export async function atualizarFlagAtivo(cnRecorrencia: number, flAtivo: boolean): Promise<number> {
  const result = await pool.query(
    `UPDATE wpp_finance.tbl_recorrencia SET fl_ativo = $1 WHERE cn_recorrencia = $2`,
    [flAtivo, cnRecorrencia],
  );

  return result.rowCount ?? 0;
}

export async function excluirRecorrencia(cnRecorrencia: number): Promise<number> {
  const result = await pool.query(
    `DELETE FROM wpp_finance.tbl_recorrencia WHERE cn_recorrencia = $1`,
    [cnRecorrencia],
  );

  return result.rowCount ?? 0;
}

export async function listarGruposComRecorrenciasAtivas(): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT ds_grupo_jid FROM wpp_finance.tbl_recorrencia WHERE fl_ativo = TRUE`,
  );

  return result.rows.map((row) => String(row.ds_grupo_jid));
}

export async function listarPendentesNoGrupo(dsGrupoJid: string, mesRef: string): Promise<Recorrencia[]> {
  const result = await pool.query(
    `
      SELECT r.*, p.nm_apelido AS nm_pessoa_gasto
      FROM wpp_finance.tbl_recorrencia r
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = r.cn_pessoa_gasto
      WHERE r.fl_ativo = TRUE
        AND r.ds_grupo_jid = $1
        AND r.dt_inicio <= CURRENT_DATE
        AND (r.dt_fim IS NULL OR r.dt_fim >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM wpp_finance.tbl_lancamento l
          WHERE l.nr_mensagem_wa_id = 'rec:' || r.cn_recorrencia || ':' || $2
        )
    `,
    [dsGrupoJid, mesRef],
  );

  return result.rows.map(mapRecorrencia);
}
