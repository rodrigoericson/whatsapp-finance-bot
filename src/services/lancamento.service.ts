import {
  inserirLancamento,
  buscarUltimoAtivoPorUsuario,
  estornarLancamento,
  inserirLancamentoParcelado,
  estornarGrupoParcela,
  buscarLancamentosRecentesPorUsuario,
  buscarLancamentoPorId,
  corrigirLancamento,
  corrigirGrupoParcela,
  type ParcelaInput,
  type LancamentoPatch,
} from '../db/repositories/lancamento.repo.js';
import { upsertUsuario } from '../db/repositories/usuario.repo.js';
import { parseCorrecao, type CorrecaoPatch } from '../parser/correcao.js';
import { parseGastoCommand, parseGastoNatural, type GastoParseResult } from '../parser/gasto.js';
import { mesReferencia } from '../parser/periodo.js';
import { formatCurrency } from './format.js';

export type AutorMensagem = {
  nrTelefone: string;
  nmApelido: string;
  nmPushname?: string | null;
};

export type RegistrarGastoInput = {
  texto: string;
  autor: AutorMensagem;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
};

export async function registrarGasto(input: RegistrarGastoInput): Promise<string> {
  const parsed = parseGastoCommand(input.texto) ?? parseGastoNatural(input.texto);

  if (!parsed) {
    return '❌ Não consegui entender o gasto. Use: gasto 50 descrição forma_pagamento';
  }

  if (parsed.qtParcelas) {
    return inserirParcelado(input, parsed);
  }

  return inserirAVista(input, parsed);
}

export async function desfazerLancamento(input: { autor: AutorMensagem; dsGrupoJid: string; cnLancamento?: number }): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const lancamento = input.cnLancamento
    ? await buscarLancamentoPorId({ cnLancamento: input.cnLancamento, cnUsuario: usuario.cnUsuario, dsGrupoJid: input.dsGrupoJid })
    : await buscarUltimoAtivoPorUsuario(usuario.cnUsuario, input.dsGrupoJid);

  if (!lancamento) {
    return input.cnLancamento
      ? 'ℹ️ Não encontrei esse lançamento entre os seus gastos ativos neste grupo.'
      : 'ℹ️ Não encontrei lançamento ativo para desfazer neste grupo.';
  }

  if (lancamento.cnParcelaGrupo && lancamento.qtParcelasTotal) {
    const removed = await estornarGrupoParcela(lancamento.cnParcelaGrupo);
    return `↩️ Estornado: ${lancamento.qtParcelasTotal}x de ${formatCurrency(lancamento.vlValor)} — ${lancamento.dsDescricao} (${removed} parcelas removidas)`;
  }

  await estornarLancamento(lancamento.cnLancamento);

  return `↩️ Estornado: ${formatCurrency(lancamento.vlValor)} — ${lancamento.dsDescricao}`;
}

export async function listarUltimosLancamentos(input: { autor: AutorMensagem; dsGrupoJid: string }): Promise<string> {
  return listarLancamentos(input, {
    titulo: '🧾 Seus últimos lançamentos:',
    limite: 5,
    rodape: ['Para corrigir: corrigir 42 valor 60 descricao almoço forma pix'],
  });
}

export async function listarLancamentosAtivos(input: { autor: AutorMensagem; dsGrupoJid: string }): Promise<string> {
  return listarLancamentos(input, {
    titulo: '🧾 Seus lançamentos ativos:',
    limite: 10,
    rodape: ['Para corrigir: corrigir 42 valor 60 descricao almoço forma pix', 'Para excluir/estornar: desfazer 42'],
  });
}

async function listarLancamentos(
  input: { autor: AutorMensagem; dsGrupoJid: string },
  options: { titulo: string; limite: number; rodape: string[] },
): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const lancamentos = await buscarLancamentosRecentesPorUsuario({
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
    limite: options.limite,
  });

  if (lancamentos.length === 0) {
    return 'ℹ️ Não encontrei lançamentos ativos seus neste grupo.';
  }

  return [options.titulo, ...lancamentos.map(formatLancamentoLinha), '', ...options.rodape].join('\n');
}

function formatLancamentoLinha(item: Awaited<ReturnType<typeof buscarLancamentosRecentesPorUsuario>>[number]): string {
  const parcela = item.qtParcelasTotal ? ` · ${item.nrParcela}/${item.qtParcelasTotal}` : '';
  const forma = item.dsFormaPagamento ? ` · ${item.dsFormaPagamento}` : '';
  const pessoa = item.cnPessoaGasto !== item.cnUsuario ? ` · pessoa: ${item.nmPessoaGasto}` : '';
  return `#${item.cnLancamento} — ${formatCurrency(item.vlValor)} · ${item.dsDescricao}${forma}${pessoa} · ${item.nrMesReferencia}${parcela}`;
}

export async function corrigirLancamentoPorTexto(input: RegistrarGastoInput): Promise<string> {
  const parsed = parseCorrecao(input.texto);

  if (!parsed) {
    return '❌ Formato: corrigir 42 valor 60 descricao almoço forma pix';
  }

  const usuario = await upsertUsuario(input.autor);
  const lancamento = await buscarLancamentoPorId({
    cnLancamento: parsed.cnLancamento,
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
  });

  if (!lancamento) {
    return 'ℹ️ Não encontrei esse lançamento entre os seus gastos ativos neste grupo.';
  }

  if (lancamento.cnParcelaGrupo && parsed.patch.valor !== undefined) {
    return '❌ Por segurança, não corrijo valor de compra parcelada na v1. Use desfazer e lance novamente.';
  }

  const patch = toLancamentoPatch(parsed.patch, input.texto);
  const updated = lancamento.cnParcelaGrupo
    ? await corrigirGrupoParcela(lancamento.cnParcelaGrupo, patch)
    : await corrigirLancamento(lancamento.cnLancamento, patch);

  if (updated === 0) {
    return 'ℹ️ Nenhum lançamento foi alterado.';
  }

  const alvo = lancamento.cnParcelaGrupo ? `${updated} parcelas` : `#${lancamento.cnLancamento}`;
  return `✅ Corrigido: ${alvo}`;
}

function toLancamentoPatch(patch: CorrecaoPatch, dsMensagemCorrecao: string): LancamentoPatch {
  return {
    vlValor: patch.valor,
    dsDescricao: patch.descricao,
    dsCategoria: patch.categoria,
    dsFormaPagamento: patch.formaPagamento,
    dsMensagemCorrecao,
  };
}

async function resolverPessoaGasto(autor: AutorMensagem, pessoaGastoNome: string | null) {
  if (!pessoaGastoNome) {
    return upsertUsuario(autor);
  }

  return upsertUsuario({
    nrTelefone: `manual:${slugPessoa(pessoaGastoNome)}`,
    nmApelido: pessoaGastoNome,
    nmPushname: null,
  });
}

function slugPessoa(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function inserirAVista(input: RegistrarGastoInput, parsed: GastoParseResult): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const pessoaGasto = await resolverPessoaGasto(input.autor, parsed.pessoaGastoNome);
  const lancamento = await inserirLancamento({
    cnUsuario: usuario.cnUsuario,
    cnPessoaGasto: pessoaGasto.cnUsuario,
    dsDescricao: parsed.descricao,
    dsCategoria: parsed.categoria,
    dsFormaPagamento: parsed.formaPagamento,
    dsMensagemOriginal: input.texto,
    dsGrupoJid: input.dsGrupoJid,
    nrMensagemWaId: input.nrMensagemWaId,
    nrMesReferencia: mesReferencia(),
    vlValor: parsed.valor,
  });

  if (!lancamento) {
    return 'ℹ️ Esse lançamento já foi registrado antes.';
  }

  const forma = parsed.formaPagamento ? ` (${parsed.formaPagamento})` : '';
  const categoria = parsed.categoria ? ` — ${parsed.categoria}` : '';

  const pessoa = parsed.pessoaGastoNome ? ` · pessoa: ${pessoaGasto.nmApelido}` : '';

  return `✅ Lançado: ${formatCurrency(parsed.valor)} — ${parsed.descricao}${forma}${categoria}${pessoa}`;
}

async function inserirParcelado(input: RegistrarGastoInput, parsed: GastoParseResult): Promise<string> {
  const qtParcelas = parsed.qtParcelas;

  if (!qtParcelas || qtParcelas < 2 || qtParcelas > 48) {
    return '❌ Parcelamento inválido. Use de 2 a 48 parcelas.';
  }

  const usuario = await upsertUsuario(input.autor);
  const pessoaGasto = await resolverPessoaGasto(input.autor, parsed.pessoaGastoNome);
  const formaPagamento = parsed.formaPagamento ?? 'cartao';
  const parcelas = calcularParcelas(parsed.valor, qtParcelas);
  const lancamentos = await inserirLancamentoParcelado({
    cnUsuario: usuario.cnUsuario,
    cnPessoaGasto: pessoaGasto.cnUsuario,
    dsDescricao: parsed.descricao,
    dsCategoria: parsed.categoria,
    dsFormaPagamento: formaPagamento,
    dsMensagemOriginal: input.texto,
    dsGrupoJid: input.dsGrupoJid,
    nrMensagemWaId: input.nrMensagemWaId,
    qtParcelasTotal: qtParcelas,
    vlValorTotalCompra: parsed.valor,
    parcelas,
  });

  if (lancamentos.length === 0) {
    return 'ℹ️ Esse lançamento parcelado já foi registrado antes.';
  }

  const primeira = lancamentos[0];
  const ultima = lancamentos.at(-1) ?? primeira;

  const pessoa = parsed.pessoaGastoNome ? ` · pessoa: ${pessoaGasto.nmApelido}` : '';

  return [
    `✅ Lançado: ${qtParcelas}x de ${formatCurrency(primeira.vlValor)} (total ${formatCurrency(parsed.valor)}) — ${parsed.descricao} (${formaPagamento})${pessoa}`,
    `📅 Primeira parcela: ${primeira.nrMesReferencia} · Última: ${ultima.nrMesReferencia}`,
  ].join('\n');
}

function calcularParcelas(valorTotal: number, qtParcelas: number): ParcelaInput[] {
  const totalCents = Math.round(valorTotal * 100);
  const baseCents = Math.floor(totalCents / qtParcelas);
  const remainder = totalCents % qtParcelas;

  return Array.from({ length: qtParcelas }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);
    const date = new Date();

    if (index === 0) {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setMonth(date.getMonth() + index, 1);
      date.setHours(0, 0, 0, 0);
    }

    return {
      nrParcela: index + 1,
      nrMesReferencia: mesReferencia(date),
      vlValor: cents / 100,
      dtLancamento: date,
    };
  });
}
