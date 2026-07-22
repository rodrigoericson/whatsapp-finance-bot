import {
  corrigirLancamentoPorTexto,
  desfazerUltimo,
  listarUltimosLancamentos,
  registrarGasto,
  type AutorMensagem,
} from '../../services/lancamento.service.js';
import { gerarQuemDeve, gerarResumo } from '../../services/resumo.service.js';

export type CommandContext = {
  texto: string;
  autor: AutorMensagem;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
};

export async function handleCommand(context: CommandContext): Promise<string | null> {
  const [command, ...args] = context.texto.trim().split(/\s+/);
  const normalized = command.toLowerCase();

  if (normalized === '!gasto' || normalized === 'gasto') {
    return registrarGasto(context);
  }

  if (normalized === '!resumo' || normalized === 'resumo') {
    return gerarResumo({ dsGrupoJid: context.dsGrupoJid, periodoRaw: args[0] });
  }

  if (normalized === '!quem-deve' || normalized === 'quem-deve' || isQuemDeve(context.texto)) {
    return gerarQuemDeve({ dsGrupoJid: context.dsGrupoJid, periodoRaw: args[0] });
  }

  if (normalized === '!desfazer' || normalized === 'desfazer') {
    return desfazerUltimo({ autor: context.autor, dsGrupoJid: context.dsGrupoJid });
  }

  if (normalized === '!ultimos' || normalized === '!últimos' || normalized === 'ultimos' || normalized === 'últimos') {
    return listarUltimosLancamentos({ autor: context.autor, dsGrupoJid: context.dsGrupoJid });
  }

  if (normalized === '!corrigir' || normalized === 'corrigir') {
    return corrigirLancamentoPorTexto(context);
  }

  if (normalized === '!ajuda' || normalized === 'ajuda') {
    return [
      '🤖 Comandos disponíveis:',
      '- gasto 50 almoço pix',
      '- gasto marcelo 600 planta baixa pix',
      '- gasto marcelo 2056 servidor particular em 10 vezes no cartão categoria infra',
      '- resumo [hoje|semana|mes|YYYY-MM]',
      '- quem deve',
      '- ultimos',
      '- corrigir 42 valor 60 descricao almoço forma pix',
      '- desfazer',
      '',
      'Se preferir, os comandos com ! também continuam funcionando.',
    ].join('\n');
  }

  return null;
}

function isQuemDeve(texto: string): boolean {
  return /^!?quem\s+deve(?:\s|$)/i.test(texto.trim());
}
