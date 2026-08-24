import { resumoPorCampo, resumoPorFormaPagamento, resumoPorUsuario, totalGeral, totalPeriodo, type ResumoPorFormaPagamento } from '../db/repositories/lancamento.repo.js';
import { parsePeriodo } from '../parser/periodo.js';
import { formatCurrency, formatPercent } from './format.js';

export async function gerarResumo(input: { dsGrupoJid: string; periodoRaw?: string }): Promise<string> {
  const periodo = parsePeriodo(input.periodoRaw);
  const filtro = { dsGrupoJid: input.dsGrupoJid, inicio: periodo.inicio, fim: periodo.fim };
  const [total, usuarios, categorias, formas, geral] = await Promise.all([
    totalPeriodo(filtro),
    resumoPorUsuario(filtro),
    resumoPorCampo({ ...filtro, campo: 'ds_categoria' }),
    resumoPorFormaPagamento(filtro),
    totalGeral(input.dsGrupoJid),
  ]);

  const lines = [`📊 Resumo — ${periodo.label}`, `Total: ${formatCurrency(total)}`, ''];

  lines.push('Por pessoa:');
  lines.push(...formatLista(usuarios.map((item) => ({ nome: item.nmApelido, vlTotal: item.vlTotal }))));
  lines.push('', 'Categorias:');
  lines.push(...formatLista(categorias));
  lines.push('', 'Formas de pagamento:');
  lines.push(...formatFormasPagamento(formas));

  if (geral.qtLancamentos > 0) {
    lines.push('', `💰 Total geral: ${formatCurrency(geral.vlTotal)}`);
  }

  return lines.join('\n');
}

export async function gerarTotalGeral(dsGrupoJid: string): Promise<string> {
  const { vlTotal, qtLancamentos } = await totalGeral(dsGrupoJid);

  if (qtLancamentos === 0) {
    return 'ℹ️ Nenhum lançamento registrado neste grupo.';
  }

  const label = qtLancamentos === 1 ? '1 lançamento' : `${qtLancamentos} lançamentos`;
  return `💰 Total geral: ${formatCurrency(vlTotal)} (${label})`;
}

export async function gerarQuemDeve(input: { dsGrupoJid: string; periodoRaw?: string }): Promise<string> {
  const periodo = parsePeriodo(input.periodoRaw);
  const usuarios = await resumoPorUsuario({ dsGrupoJid: input.dsGrupoJid, inicio: periodo.inicio, fim: periodo.fim });
  const total = usuarios.reduce((acc, item) => acc + Number(item.vlTotal), 0);

  if (usuarios.length === 0 || total === 0) {
    return `ℹ️ Nenhum gasto encontrado para ${periodo.label}.`;
  }

  const lines = [`🏁 Ranking — ${periodo.label}`];

  usuarios.forEach((item, index) => {
    const value = Number(item.vlTotal);
    lines.push(`${index + 1}. ${item.nmApelido}: ${formatCurrency(value)} (${formatPercent(value / total)})`);
  });

  return lines.join('\n');
}

function formatLista(items: Array<{ nome: string; vlTotal: string }>): string[] {
  if (items.length === 0) {
    return ['- sem dados'];
  }

  return items.map((item) => `- ${item.nome}: ${formatCurrency(item.vlTotal)}`);
}

function formatFormasPagamento(items: ResumoPorFormaPagamento[]): string[] {
  if (items.length === 0) {
    return ['- sem dados'];
  }

  return items.map(formatFormaPagamento);
}

export function formatFormaPagamento(item: ResumoPorFormaPagamento): string {
  if (!item.qtParcelasTotal || !item.vlParcela) {
    return `- ${item.nome}: ${formatCurrency(item.vlTotal)}`;
  }

  const descricao = item.dsDescricao ? ` — ${item.dsDescricao}` : '';
  return `- ${item.nome} ${formatCurrency(item.vlTotal)} em ${item.qtParcelasTotal}x de ${formatCurrency(item.vlParcela)}${descricao}`;
}
