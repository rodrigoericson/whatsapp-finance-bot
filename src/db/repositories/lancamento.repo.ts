import { pool } from '../pool.js';

export type ParcelaInput = {
  nrParcela: number;
  nrMesReferencia: string;
  vlValor: number;
  dtLancamento: Date;
};

export type Lancamento = {
  cnLancamento: number;
  cnUsuario: number;
  nmApelido: string;
  cnPessoaGasto: number;
  nmPessoaGasto: string;
  dsDescricao: string;
  dsCategoria: string | null;
  dsFormaPagamento: string | null;
  vlValor: string;
  nrMesReferencia: string;
  dtLancamento: Date;
  cnParcelaGrupo: number | null;
  nrParcela: number | null;
  qtParcelasTotal: number | null;
  vlValorTotalCompra: string | null;
};

export type ResumoPorUsuario = {
  cnUsuario: number;
  nmApelido: string;
  vlTotal: string;
};

export type ResumoPorTexto = {
  nome: string;
  vlTotal: string;
};

export type ResumoPorFormaPagamento = {
  nome: string;
  dsDescricao: string | null;
  vlTotal: string;
  qtParcelasTotal: number | null;
  vlParcela: string | null;
};

export type LancamentoPatch = {
  vlValor?: number;
  dsDescricao?: string;
  dsCategoria?: string | null;
  dsFormaPagamento?: string | null;
  dsMensagemCorrecao: string;
};

function mapLancamento(row: Record<string, unknown>): Lancamento {
  return {
    cnLancamento: Number(row.cn_lancamento),
    cnUsuario: Number(row.cn_usuario),
    nmApelido: String(row.nm_apelido),
    cnPessoaGasto: Number(row.cn_pessoa_gasto),
    nmPessoaGasto: String(row.nm_pessoa_gasto),
    dsDescricao: String(row.ds_descricao),
    dsCategoria: row.ds_categoria === null ? null : String(row.ds_categoria),
    dsFormaPagamento: row.ds_forma_pagamento === null ? null : String(row.ds_forma_pagamento),
    vlValor: String(row.vl_valor),
    nrMesReferencia: String(row.nr_mes_referencia),
    dtLancamento: row.dt_lancamento as Date,
    cnParcelaGrupo: row.cn_parcela_grupo === null ? null : Number(row.cn_parcela_grupo),
    nrParcela: row.nr_parcela === null ? null : Number(row.nr_parcela),
    qtParcelasTotal: row.qt_parcelas_total === null ? null : Number(row.qt_parcelas_total),
    vlValorTotalCompra: row.vl_valor_total_compra === null ? null : String(row.vl_valor_total_compra),
  };
}

export async function inserirLancamento(input: {
  cnUsuario: number;
  cnPessoaGasto: number;
  dsDescricao: string;
  dsCategoria?: string | null;
  dsFormaPagamento?: string | null;
  dsMensagemOriginal: string;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
  nrMesReferencia: string;
  vlValor: number;
}): Promise<Lancamento | null> {
  const result = await pool.query(
    `
      INSERT INTO wpp_finance.tbl_lancamento (
        cn_usuario,
        cn_pessoa_gasto,
        ds_descricao,
        ds_categoria,
        ds_forma_pagamento,
        ds_mensagem_original,
        ds_grupo_jid,
        nr_mensagem_wa_id,
        nr_mes_referencia,
        vl_valor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (nr_mensagem_wa_id) WHERE nr_mensagem_wa_id IS NOT NULL DO NOTHING
      RETURNING cn_lancamento, cn_usuario, cn_pessoa_gasto, ds_descricao, ds_categoria, ds_forma_pagamento, vl_valor, nr_mes_referencia, dt_lancamento,
        cn_parcela_grupo, nr_parcela, qt_parcelas_total, vl_valor_total_compra,
        (SELECT nm_apelido FROM wpp_finance.tbl_usuario u WHERE u.cn_usuario = tbl_lancamento.cn_usuario) AS nm_apelido,
        (SELECT nm_apelido FROM wpp_finance.tbl_usuario p WHERE p.cn_usuario = tbl_lancamento.cn_pessoa_gasto) AS nm_pessoa_gasto
    `,
    [
      input.cnUsuario,
      input.cnPessoaGasto,
      input.dsDescricao,
      input.dsCategoria ?? null,
      input.dsFormaPagamento ?? null,
      input.dsMensagemOriginal,
      input.dsGrupoJid,
      input.nrMensagemWaId ?? null,
      input.nrMesReferencia,
      input.vlValor,
    ],
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapLancamento(result.rows[0]);
}

export async function inserirLancamentoParcelado(input: {
  cnUsuario: number;
  cnPessoaGasto: number;
  dsDescricao: string;
  dsCategoria?: string | null;
  dsFormaPagamento: string;
  dsMensagemOriginal: string;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
  qtParcelasTotal: number;
  vlValorTotalCompra: number;
  parcelas: ParcelaInput[];
}): Promise<Lancamento[]> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const groupResult = await client.query("SELECT nextval('wpp_finance.tbl_lancamento_cn_lancamento_seq') AS cn_parcela_grupo");
    const cnParcelaGrupo = Number(groupResult.rows[0].cn_parcela_grupo);
    const lancamentos: Lancamento[] = [];

    for (const parcela of input.parcelas) {
      const messageId = input.nrMensagemWaId ? `${input.nrMensagemWaId}:${parcela.nrParcela}` : null;
      const result = await client.query(
        `
          INSERT INTO wpp_finance.tbl_lancamento (
            cn_usuario,
            cn_pessoa_gasto,
            ds_descricao,
            ds_categoria,
            ds_forma_pagamento,
            ds_mensagem_original,
            ds_grupo_jid,
            nr_mensagem_wa_id,
            nr_mes_referencia,
            vl_valor,
            dt_lancamento,
            cn_parcela_grupo,
            nr_parcela,
            qt_parcelas_total,
            vl_valor_total_compra
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (nr_mensagem_wa_id) WHERE nr_mensagem_wa_id IS NOT NULL DO NOTHING
          RETURNING cn_lancamento, cn_usuario, cn_pessoa_gasto, ds_descricao, ds_categoria, ds_forma_pagamento, vl_valor, nr_mes_referencia, dt_lancamento,
            cn_parcela_grupo, nr_parcela, qt_parcelas_total, vl_valor_total_compra,
            (SELECT nm_apelido FROM wpp_finance.tbl_usuario u WHERE u.cn_usuario = tbl_lancamento.cn_usuario) AS nm_apelido,
            (SELECT nm_apelido FROM wpp_finance.tbl_usuario p WHERE p.cn_usuario = tbl_lancamento.cn_pessoa_gasto) AS nm_pessoa_gasto
        `,
        [
          input.cnUsuario,
          input.cnPessoaGasto,
          input.dsDescricao,
          input.dsCategoria ?? null,
          input.dsFormaPagamento,
          input.dsMensagemOriginal,
          input.dsGrupoJid,
          messageId,
          parcela.nrMesReferencia,
          parcela.vlValor,
          parcela.dtLancamento,
          cnParcelaGrupo,
          parcela.nrParcela,
          input.qtParcelasTotal,
          input.vlValorTotalCompra,
        ],
      );

      if ((result.rowCount ?? 0) > 0) {
        lancamentos.push(mapLancamento(result.rows[0]));
      }
    }

    await client.query('COMMIT');
    return lancamentos;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function buscarUltimoAtivoPorUsuario(cnUsuario: number, dsGrupoJid: string): Promise<Lancamento | null> {
  const result = await pool.query(
    `
      SELECT l.cn_lancamento, l.cn_usuario, u.nm_apelido, l.cn_pessoa_gasto, p.nm_apelido AS nm_pessoa_gasto,
        l.ds_descricao, l.ds_categoria, l.ds_forma_pagamento, l.vl_valor, l.nr_mes_referencia,
        l.dt_lancamento, l.cn_parcela_grupo, l.nr_parcela, l.qt_parcelas_total, l.vl_valor_total_compra
      FROM wpp_finance.tbl_lancamento l
      JOIN wpp_finance.tbl_usuario u ON u.cn_usuario = l.cn_usuario
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = l.cn_pessoa_gasto
      WHERE l.cn_usuario = $1
        AND l.ds_grupo_jid = $2
        AND l.fl_estornado = FALSE
      ORDER BY l.dt_criacao DESC, l.cn_lancamento DESC
      LIMIT 1
    `,
    [cnUsuario, dsGrupoJid],
  );

  return (result.rowCount ?? 0) === 0 ? null : mapLancamento(result.rows[0]);
}

export async function buscarLancamentosRecentesPorUsuario(input: {
  cnUsuario: number;
  dsGrupoJid: string;
  limite: number;
}): Promise<Lancamento[]> {
  const result = await pool.query(
    `
      SELECT l.cn_lancamento, l.cn_usuario, u.nm_apelido, l.cn_pessoa_gasto, p.nm_apelido AS nm_pessoa_gasto,
        l.ds_descricao, l.ds_categoria, l.ds_forma_pagamento, l.vl_valor, l.nr_mes_referencia,
        l.dt_lancamento, l.cn_parcela_grupo, l.nr_parcela, l.qt_parcelas_total, l.vl_valor_total_compra
      FROM wpp_finance.tbl_lancamento l
      JOIN wpp_finance.tbl_usuario u ON u.cn_usuario = l.cn_usuario
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = l.cn_pessoa_gasto
      WHERE l.cn_usuario = $1
        AND l.ds_grupo_jid = $2
        AND l.fl_estornado = FALSE
      ORDER BY l.dt_criacao DESC, l.cn_lancamento DESC
      LIMIT $3
    `,
    [input.cnUsuario, input.dsGrupoJid, input.limite],
  );

  return result.rows.map(mapLancamento);
}

export async function buscarLancamentoPorId(input: {
  cnLancamento: number;
  cnUsuario: number;
  dsGrupoJid: string;
}): Promise<Lancamento | null> {
  const result = await pool.query(
    `
      SELECT l.cn_lancamento, l.cn_usuario, u.nm_apelido, l.cn_pessoa_gasto, p.nm_apelido AS nm_pessoa_gasto,
        l.ds_descricao, l.ds_categoria, l.ds_forma_pagamento, l.vl_valor, l.nr_mes_referencia,
        l.dt_lancamento, l.cn_parcela_grupo, l.nr_parcela, l.qt_parcelas_total, l.vl_valor_total_compra
      FROM wpp_finance.tbl_lancamento l
      JOIN wpp_finance.tbl_usuario u ON u.cn_usuario = l.cn_usuario
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = l.cn_pessoa_gasto
      WHERE l.cn_lancamento = $1
        AND l.cn_usuario = $2
        AND l.ds_grupo_jid = $3
        AND l.fl_estornado = FALSE
      LIMIT 1
    `,
    [input.cnLancamento, input.cnUsuario, input.dsGrupoJid],
  );

  return (result.rowCount ?? 0) === 0 ? null : mapLancamento(result.rows[0]);
}

export async function corrigirLancamento(cnLancamento: number, patch: LancamentoPatch): Promise<number> {
  const sets: string[] = [];
  const values: unknown[] = [];

  pushPatch(sets, values, 'vl_valor', patch.vlValor);
  pushPatch(sets, values, 'ds_descricao', patch.dsDescricao);
  pushPatch(sets, values, 'ds_categoria', patch.dsCategoria);
  pushPatch(sets, values, 'ds_forma_pagamento', patch.dsFormaPagamento);
  pushPatch(sets, values, 'ds_mensagem_correcao', patch.dsMensagemCorrecao);
  sets.push('dt_correcao = NOW()');
  values.push(cnLancamento);

  const result = await pool.query(
    `UPDATE wpp_finance.tbl_lancamento SET ${sets.join(', ')} WHERE cn_lancamento = $${values.length} AND fl_estornado = FALSE`,
    values,
  );

  return result.rowCount ?? 0;
}

export async function corrigirGrupoParcela(cnParcelaGrupo: number, patch: Omit<LancamentoPatch, 'vlValor'>): Promise<number> {
  const sets: string[] = [];
  const values: unknown[] = [];

  pushPatch(sets, values, 'ds_descricao', patch.dsDescricao);
  pushPatch(sets, values, 'ds_categoria', patch.dsCategoria);
  pushPatch(sets, values, 'ds_forma_pagamento', patch.dsFormaPagamento);
  pushPatch(sets, values, 'ds_mensagem_correcao', patch.dsMensagemCorrecao);
  sets.push('dt_correcao = NOW()');
  values.push(cnParcelaGrupo);

  const result = await pool.query(
    `UPDATE wpp_finance.tbl_lancamento SET ${sets.join(', ')} WHERE cn_parcela_grupo = $${values.length} AND fl_estornado = FALSE`,
    values,
  );

  return result.rowCount ?? 0;
}

function pushPatch(sets: string[], values: unknown[], column: string, value: unknown): void {
  if (value === undefined) {
    return;
  }

  values.push(value);
  sets.push(`${column} = $${values.length}`);
}

export async function estornarLancamento(cnLancamento: number): Promise<number> {
  const result = await pool.query(
    `
      UPDATE wpp_finance.tbl_lancamento
      SET fl_estornado = TRUE, dt_estorno = NOW()
      WHERE cn_lancamento = $1 AND fl_estornado = FALSE
    `,
    [cnLancamento],
  );

  return result.rowCount ?? 0;
}

export async function estornarGrupoParcela(cnParcelaGrupo: number): Promise<number> {
  const result = await pool.query(
    `
      UPDATE wpp_finance.tbl_lancamento
      SET fl_estornado = TRUE, dt_estorno = NOW()
      WHERE cn_parcela_grupo = $1 AND fl_estornado = FALSE
    `,
    [cnParcelaGrupo],
  );

  return result.rowCount ?? 0;
}

export async function totalGeral(dsGrupoJid: string): Promise<{ vlTotal: string; qtLancamentos: number }> {
  const result = await pool.query(
    `
      SELECT COALESCE(SUM(vl_valor), 0)::text AS vl_total,
        COUNT(*)::int AS qt_lancamentos
      FROM wpp_finance.tbl_lancamento
      WHERE ds_grupo_jid = $1
        AND fl_estornado = FALSE
    `,
    [dsGrupoJid],
  );

  return { vlTotal: String(result.rows[0].vl_total), qtLancamentos: Number(result.rows[0].qt_lancamentos) };
}

export async function totalPeriodo(input: { dsGrupoJid: string; inicio: Date; fim: Date }): Promise<string> {
  const result = await pool.query(
    `
      SELECT COALESCE(SUM(CASE WHEN cn_parcela_grupo IS NOT NULL AND nr_parcela <> 1 THEN 0 ELSE COALESCE(vl_valor_total_compra, vl_valor) END), 0) AS vl_total
      FROM wpp_finance.tbl_lancamento
      WHERE ds_grupo_jid = $1
        AND fl_estornado = FALSE
        AND dt_lancamento >= $2
        AND dt_lancamento < $3
    `,
    [input.dsGrupoJid, input.inicio, input.fim],
  );

  return String(result.rows[0].vl_total);
}

export async function resumoPorUsuario(input: { dsGrupoJid: string; inicio: Date; fim: Date }): Promise<ResumoPorUsuario[]> {
  const result = await pool.query(
    `
      SELECT p.cn_usuario, p.nm_apelido, COALESCE(SUM(CASE WHEN l.cn_parcela_grupo IS NOT NULL AND l.nr_parcela <> 1 THEN 0 ELSE COALESCE(l.vl_valor_total_compra, l.vl_valor) END), 0) AS vl_total
      FROM wpp_finance.tbl_lancamento l
      JOIN wpp_finance.tbl_usuario p ON p.cn_usuario = l.cn_pessoa_gasto
      WHERE l.ds_grupo_jid = $1
        AND l.fl_estornado = FALSE
        AND l.dt_lancamento >= $2
        AND l.dt_lancamento < $3
      GROUP BY p.cn_usuario, p.nm_apelido
      ORDER BY vl_total DESC, p.nm_apelido
    `,
    [input.dsGrupoJid, input.inicio, input.fim],
  );

  return result.rows.map((row) => ({
    cnUsuario: Number(row.cn_usuario),
    nmApelido: String(row.nm_apelido),
    vlTotal: String(row.vl_total),
  }));
}

export async function resumoPorCampo(input: {
  dsGrupoJid: string;
  inicio: Date;
  fim: Date;
  campo: 'ds_categoria' | 'ds_forma_pagamento';
}): Promise<ResumoPorTexto[]> {
  const result = await pool.query(
    `
      SELECT COALESCE(${input.campo}, 'sem informação') AS nome, COALESCE(SUM(CASE WHEN cn_parcela_grupo IS NOT NULL AND nr_parcela <> 1 THEN 0 ELSE COALESCE(vl_valor_total_compra, vl_valor) END), 0) AS vl_total
      FROM wpp_finance.tbl_lancamento
      WHERE ds_grupo_jid = $1
        AND fl_estornado = FALSE
        AND dt_lancamento >= $2
        AND dt_lancamento < $3
      GROUP BY COALESCE(${input.campo}, 'sem informação')
      ORDER BY vl_total DESC, nome
      LIMIT 5
    `,
    [input.dsGrupoJid, input.inicio, input.fim],
  );

  return result.rows.map((row) => ({ nome: String(row.nome), vlTotal: String(row.vl_total) }));
}

export async function resumoPorFormaPagamento(input: { dsGrupoJid: string; inicio: Date; fim: Date }): Promise<ResumoPorFormaPagamento[]> {
  const result = await pool.query(
    `
      SELECT COALESCE(ds_forma_pagamento, 'sem informação') AS nome,
        MIN(ds_descricao) AS ds_descricao,
        COALESCE(SUM(CASE WHEN cn_parcela_grupo IS NOT NULL AND nr_parcela <> 1 THEN 0 ELSE COALESCE(vl_valor_total_compra, vl_valor) END), 0) AS vl_total,
        CASE WHEN cn_parcela_grupo IS NULL THEN NULL ELSE MIN(qt_parcelas_total) END AS qt_parcelas_total,
        CASE WHEN cn_parcela_grupo IS NULL THEN NULL ELSE MIN(vl_valor) END AS vl_parcela
      FROM wpp_finance.tbl_lancamento
      WHERE ds_grupo_jid = $1
        AND fl_estornado = FALSE
        AND dt_lancamento >= $2
        AND dt_lancamento < $3
      GROUP BY COALESCE(ds_forma_pagamento, 'sem informação'), cn_parcela_grupo
      HAVING COALESCE(SUM(CASE WHEN cn_parcela_grupo IS NOT NULL AND nr_parcela <> 1 THEN 0 ELSE COALESCE(vl_valor_total_compra, vl_valor) END), 0) > 0
      ORDER BY vl_total DESC, nome
      LIMIT 5
    `,
    [input.dsGrupoJid, input.inicio, input.fim],
  );

  return result.rows.map((row) => ({
    nome: String(row.nome),
    dsDescricao: row.ds_descricao === null ? null : String(row.ds_descricao),
    vlTotal: String(row.vl_total),
    qtParcelasTotal: row.qt_parcelas_total === null ? null : Number(row.qt_parcelas_total),
    vlParcela: row.vl_parcela === null ? null : String(row.vl_parcela),
  }));
}
