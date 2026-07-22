import { resumoPorCampo, resumoPorUsuario, totalPeriodo } from '../db/repositories/lancamento.repo.js';
import { parsePeriodo } from '../parser/periodo.js';
import { formatCurrency, formatPercent } from './format.js';

export async function gerarResumo(input: { dsGrupoJid: string; periodoRaw?: string }): Promise<string> {
  const periodo = parsePeriodo(input.periodoRaw);
  const filtro = { dsGrupoJid: input.dsGrupoJid, inicio: periodo.inicio, fim: periodo.fim };
  const [total, usuarios, categorias, formas] = await Promise.all([
    totalPeriodo(filtro),
    resumoPorUsuario(filtro),
    resumoPorCampo({ ...filtro, campo: 'ds_categoria' }),
    resumoPorCampo({ ...filtro, campo: 'ds_forma_pagamento' }),
  ]);

  const lines = [`📊 Resumo — ${periodo.label}`, `Total: ${formatCurrency(total)}`, ''];

  lines.push('Por pessoa:');
  lines.push(...formatLista(usuarios.map((item) => ({ nome: item.nmApelido, vlTotal: item.vlTotal }))));
  lines.push('', 'Categorias:');
  lines.push(...formatLista(categorias));
  lines.push('', 'Formas de pagamento:');
  lines.push(...formatLista(formas));

  return lines.join('\n');
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
