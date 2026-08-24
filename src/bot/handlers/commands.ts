import {
  corrigirLancamentoPorTexto,
  desfazerLancamento,
  listarLancamentosAtivos,
  listarUltimosLancamentos,
  registrarGasto,
  type AutorMensagem,
} from '../../services/lancamento.service.js';
import {
  criarRecorrencia,
  listarRecorrencias,
  pausarRecorrencia,
  retomarRecorrencia,
  excluirRecorrencia,
} from '../../services/recorrencia.service.js';
import { gerarQuemDeve, gerarResumo, gerarTotalGeral } from '../../services/resumo.service.js';

export type CommandContext = {
  texto: string;
  autor: AutorMensagem;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
};

export async function handleCommand(context: CommandContext): Promise<string | null> {
  const [command, ...args] = context.texto.trim().split(/\s+/);
  const normalized = normalizeCommand(command);

  if (normalized === '!gasto' || normalized === 'gasto') {
    return registrarGasto(context);
  }

  if (normalized === '!resumo' || normalized === 'resumo') {
    return gerarResumo({ dsGrupoJid: context.dsGrupoJid, periodoRaw: args[0] });
  }

  if (normalized === '!quem-deve' || normalized === 'quem-deve' || isQuemDeve(context.texto)) {
    return gerarQuemDeve({ dsGrupoJid: context.dsGrupoJid, periodoRaw: args[0] });
  }

  if (normalized === '!total' || normalized === 'total') {
    return gerarTotalGeral(context.dsGrupoJid);
  }

  if (normalized === '!desfazer' || normalized === 'desfazer') {
    const cnLancamento = parseOptionalId(args[0]);

    if (args[0] && !cnLancamento) {
      return '❌ ID inválido. Use: desfazer 42';
    }

    return desfazerLancamento({ autor: context.autor, dsGrupoJid: context.dsGrupoJid, cnLancamento });
  }

  if (normalized === '!ultimos' || normalized === 'ultimos') {
    return listarUltimosLancamentos({ autor: context.autor, dsGrupoJid: context.dsGrupoJid });
  }

  if (normalized === '!lancamentos' || normalized === 'lancamentos') {
    return listarLancamentosAtivos({ autor: context.autor, dsGrupoJid: context.dsGrupoJid });
  }

  if (normalized === '!corrigir' || normalized === 'corrigir') {
    return corrigirLancamentoPorTexto(context);
  }

  if (normalized === '!recorrencia' || normalized === 'recorrencia') {
    return handleRecorrenciaSubcommand(context, args);
  }

  if (normalized === '!ajuda' || normalized === 'ajuda') {
    return [
      '🤖 Comandos disponíveis:',
      '',
      '💰 Formato do gasto:',
      'gasto [pessoa] <valor> <descrição> [forma] [categoria X]',
      '',
      'Exemplos:',
      '- gasto 50 almoço pix',
      '- gasto marcelo 74,23 conta elétrica cartão de crédito',
      '- gasto marcelo 600 planta baixa pix categoria obra',
      '- gasto 2056 servidor particular 10x cartão categoria infra',
      '',
      '📋 Consultas:',
      '- resumo [hoje|semana|mes|YYYY-MM]',
      '- total',
      '- quem deve',
      '- lancamentos',
      '- ultimos',
      '',
      '✏️ Edição:',
      '- corrigir <id> valor 60 descricao almoço forma pix',
      '- desfazer [id]',
      '',
      '🔁 Recorrências (gasto fixo mensal):',
      '- recorrencia criar netflix 39.90 dia 15 cartao categoria streaming',
      '- recorrencia criar pessoa marcelo spotify 21.90 dia 5 cartao',
      '- recorrencia listar',
      '- recorrencia pausar <id>',
      '- recorrencia retomar <id>',
      '- recorrencia excluir <id>',
      '',
      'ℹ️ A recorrência gera o lançamento automaticamente no dia configurado.',
      'O gasto só aparece no resumo quando o dia chegar.',
      'Pro mês atual, registre manualmente com !gasto se o dia já passou.',
      '',
      'Se preferir, os comandos com ! também continuam funcionando.',
    ].join('\n');
  }

  return null;
}

function isQuemDeve(texto: string): boolean {
  return /^!?quem\s+deve(?:\s|$)/i.test(texto.trim());
}

function normalizeCommand(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function parseOptionalId(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

async function handleRecorrenciaSubcommand(context: CommandContext, args: string[]): Promise<string> {
  const [sub, ...rest] = args;
  const subNormalized = normalizeCommand(sub ?? '');
  const remaining = rest.join(' ').trim();

  switch (subNormalized) {
    case 'criar':
      return criarRecorrencia({ texto: remaining, autor: context.autor, dsGrupoJid: context.dsGrupoJid });
    case 'listar':
    case 'lista':
      return listarRecorrencias({ autor: context.autor, dsGrupoJid: context.dsGrupoJid });
    case 'pausar': {
      const id = parseRequiredId(rest[0]);
      if (!id) return '❌ Uso: recorrencia pausar <id>';
      return pausarRecorrencia({ autor: context.autor, cnRecorrencia: id, dsGrupoJid: context.dsGrupoJid });
    }
    case 'retomar':
    case 'reativar': {
      const id = parseRequiredId(rest[0]);
      if (!id) return '❌ Uso: recorrencia retomar <id>';
      return retomarRecorrencia({ autor: context.autor, cnRecorrencia: id, dsGrupoJid: context.dsGrupoJid });
    }
    case 'excluir':
    case 'remover':
    case 'deletar': {
      const id = parseRequiredId(rest[0]);
      if (!id) return '❌ Uso: recorrencia excluir <id>';
      return excluirRecorrencia({ autor: context.autor, cnRecorrencia: id, dsGrupoJid: context.dsGrupoJid });
    }
    default:
      return [
        '🔁 Subcomandos de recorrencia:',
        '- recorrencia criar <descrição> <valor> dia <1-28> [forma] [categoria ...]',
        '- recorrencia listar',
        '- recorrencia pausar <id>',
        '- recorrencia retomar <id>',
        '- recorrencia excluir <id>',
      ].join('\n');
  }
}

function parseRequiredId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}
