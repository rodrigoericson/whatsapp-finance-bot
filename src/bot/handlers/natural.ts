import { registrarGasto, type AutorMensagem } from '../../services/lancamento.service.js';
import { parseGastoNatural } from '../../parser/gasto.js';

export type NaturalContext = {
  texto: string;
  autor: AutorMensagem;
  dsGrupoJid: string;
  nrMensagemWaId?: string | null;
};

export async function handleNatural(context: NaturalContext): Promise<string | null> {
  if (!parseGastoNatural(context.texto)) {
    return null;
  }

  return registrarGasto(context);
}
