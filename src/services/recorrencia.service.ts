import {
  inserirRecorrencia as inserirRecorrenciaRepo,
  buscarRecorrenciaPorId,
  listarRecorrenciasPorUsuario,
  atualizarFlagAtivo,
  excluirRecorrencia as excluirRecorrenciaRepo,
  listarPendentesNoGrupo,
  type Recorrencia,
} from '../db/repositories/recorrencia.repo.js';
import { inserirLancamento } from '../db/repositories/lancamento.repo.js';
import { upsertUsuario, buscarUsuarioPorNome } from '../db/repositories/usuario.repo.js';
import { parseRecorrenciaCriar } from '../parser/recorrencia.js';
import { mesReferencia } from '../parser/periodo.js';
import { formatCurrency } from './format.js';
import type { AutorMensagem } from './lancamento.service.js';

export type RecorrenciaCommandInput = {
  texto: string;
  autor: AutorMensagem;
  dsGrupoJid: string;
};

export async function criarRecorrencia(input: RecorrenciaCommandInput): Promise<string> {
  const parsed = parseRecorrenciaCriar(input.texto);

  if (!parsed) {
    return '❌ Formato: recorrencia criar <descrição> <valor> dia <1-28> [forma] [categoria ...]';
  }

  const usuario = await upsertUsuario(input.autor);
  const pessoaGasto = await resolverPessoaGasto(input.autor, parsed.pessoaGastoNome);

  const recorrencia = await inserirRecorrenciaRepo({
    cnUsuario: usuario.cnUsuario,
    cnPessoaGasto: pessoaGasto.cnUsuario,
    dsDescricao: parsed.descricao,
    dsCategoria: parsed.categoria,
    dsFormaPagamento: parsed.formaPagamento,
    vlValor: parsed.valor,
    nrDiaCobranca: parsed.nrDiaCobranca,
    dsGrupoJid: input.dsGrupoJid,
    dsMensagemOriginal: input.texto,
  });

  const forma = recorrencia.dsFormaPagamento ? ` · ${recorrencia.dsFormaPagamento}` : '';
  const categoria = recorrencia.dsCategoria ? ` · categoria ${recorrencia.dsCategoria}` : '';
  const pessoa = parsed.pessoaGastoNome ? ` · pessoa: ${recorrencia.nmPessoaGasto}` : '';

  return `🔁 Recorrência criada: #${recorrencia.cnRecorrencia} — ${formatCurrency(recorrencia.vlValor)} — ${recorrencia.dsDescricao} · dia ${recorrencia.nrDiaCobranca}${forma}${categoria}${pessoa}`;
}

export async function listarRecorrencias(input: { autor: AutorMensagem; dsGrupoJid: string }): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const recorrencias = await listarRecorrenciasPorUsuario({
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
  });

  if (recorrencias.length === 0) {
    return 'ℹ️ Nenhuma recorrência cadastrada neste grupo.';
  }

  const linhas = recorrencias.map(formatRecorrenciaLinha);
  return ['🔁 Suas recorrências:', ...linhas].join('\n');
}

export async function pausarRecorrencia(input: { autor: AutorMensagem; cnRecorrencia: number; dsGrupoJid: string }): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const recorrencia = await buscarRecorrenciaPorId({
    cnRecorrencia: input.cnRecorrencia,
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
  });

  if (!recorrencia) {
    return 'ℹ️ Recorrência não encontrada ou não pertence a você neste grupo.';
  }

  if (!recorrencia.flAtivo) {
    return 'ℹ️ Essa recorrência já está pausada.';
  }

  await atualizarFlagAtivo(input.cnRecorrencia, false);
  return `⏸️ Recorrência #${input.cnRecorrencia} pausada.`;
}

export async function retomarRecorrencia(input: { autor: AutorMensagem; cnRecorrencia: number; dsGrupoJid: string }): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const recorrencia = await buscarRecorrenciaPorId({
    cnRecorrencia: input.cnRecorrencia,
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
  });

  if (!recorrencia) {
    return 'ℹ️ Recorrência não encontrada ou não pertence a você neste grupo.';
  }

  if (recorrencia.flAtivo) {
    return 'ℹ️ Essa recorrência já está ativa.';
  }

  await atualizarFlagAtivo(input.cnRecorrencia, true);
  return `▶️ Recorrência #${input.cnRecorrencia} reativada.`;
}

export async function excluirRecorrencia(input: { autor: AutorMensagem; cnRecorrencia: number; dsGrupoJid: string }): Promise<string> {
  const usuario = await upsertUsuario(input.autor);
  const recorrencia = await buscarRecorrenciaPorId({
    cnRecorrencia: input.cnRecorrencia,
    cnUsuario: usuario.cnUsuario,
    dsGrupoJid: input.dsGrupoJid,
  });

  if (!recorrencia) {
    return 'ℹ️ Recorrência não encontrada ou não pertence a você neste grupo.';
  }

  await excluirRecorrenciaRepo(input.cnRecorrencia);
  return `🗑️ Recorrência #${input.cnRecorrencia} excluída. Lançamentos já gerados continuam ativos.`;
}

export async function gerarLancamentosRecorrentes(dsGrupoJid: string): Promise<{ gerados: number; mensagens: string[] }> {
  const hoje = new Date();
  const mesRef = mesReferencia(hoje);
  const diaHoje = hoje.getDate();

  const recorrencias = await listarPendentesNoGrupo(dsGrupoJid, mesRef);
  const mensagens: string[] = [];
  let gerados = 0;

  for (const r of recorrencias) {
    const diaEfetivo = Math.min(r.nrDiaCobranca, diasNoMes(hoje));

    if (diaEfetivo !== diaHoje) {
      continue;
    }

    const nrMensagemWaId = `rec:${r.cnRecorrencia}:${mesRef}`;

    const resultado = await inserirLancamento({
      cnUsuario: r.cnUsuario,
      cnPessoaGasto: r.cnPessoaGasto,
      dsDescricao: r.dsDescricao,
      dsCategoria: r.dsCategoria,
      dsFormaPagamento: r.dsFormaPagamento,
      dsMensagemOriginal: `[recorrencia #${r.cnRecorrencia}] ${r.dsMensagemOriginal}`,
      dsGrupoJid: r.dsGrupoJid,
      nrMensagemWaId,
      nrMesReferencia: mesRef,
      vlValor: Number(r.vlValor),
    });

    if (resultado) {
      gerados++;
      mensagens.push(`• ${formatCurrency(r.vlValor)} — ${r.dsDescricao} (${r.nmPessoaGasto})`);
    }
  }

  return { gerados, mensagens };
}

function formatRecorrenciaLinha(r: Recorrencia): string {
  const status = r.flAtivo ? 'ativa' : 'pausada';
  const forma = r.dsFormaPagamento ? ` · ${r.dsFormaPagamento}` : '';
  const categoria = r.dsCategoria ? ` · ${r.dsCategoria}` : '';
  return `#${r.cnRecorrencia} · ${r.dsDescricao} · ${formatCurrency(r.vlValor)} · dia ${r.nrDiaCobranca} · ${status}${forma}${categoria}`;
}

function diasNoMes(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

async function resolverPessoaGasto(autor: AutorMensagem, pessoaGastoNome: string | null) {
  if (!pessoaGastoNome) {
    return upsertUsuario(autor);
  }

  const existente = await buscarUsuarioPorNome(pessoaGastoNome);

  if (existente) {
    return existente;
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
