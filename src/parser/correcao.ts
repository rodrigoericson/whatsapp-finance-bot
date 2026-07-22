import { parseValor } from './gasto.js';

export type CorrecaoPatch = {
  valor?: number;
  descricao?: string;
  categoria?: string | null;
  formaPagamento?: string | null;
};

export type CorrecaoParseResult = {
  cnLancamento: number;
  patch: CorrecaoPatch;
};

const tokensValor = new Set(['valor', 'vl']);
const tokensDescricao = new Set(['descricao', 'descrição', 'desc']);
const tokensForma = new Set(['forma', 'pagamento', 'pgto']);
const tokensCategoria = new Set(['categoria', 'cat']);
const allTokens = new Set([...tokensValor, ...tokensDescricao, ...tokensForma, ...tokensCategoria]);

export function parseCorrecao(texto: string): CorrecaoParseResult | null {
  const parts = texto.trim().split(/\s+/);

  if (!/^!?corrigir$/i.test(parts[0] ?? '')) {
    return null;
  }

  const cnLancamento = Number(parts[1]);

  if (!Number.isInteger(cnLancamento) || cnLancamento <= 0) {
    return null;
  }

  const patch = parsePatch(parts.slice(2));

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return { cnLancamento, patch };
}

function parsePatch(tokens: string[]): CorrecaoPatch {
  const patch: CorrecaoPatch = {};
  let index = 0;

  while (index < tokens.length) {
    const key = normalizeToken(tokens[index]);
    const nextIndex = findNextKey(tokens, index + 1);
    const valueTokens = tokens.slice(index + 1, nextIndex);
    const value = valueTokens.join(' ').trim();

    if (tokensValor.has(key)) {
      const parsed = parseValor(value);
      if (parsed !== null) {
        patch.valor = parsed;
      }
    } else if (tokensDescricao.has(key) && value) {
      patch.descricao = value;
    } else if (tokensForma.has(key) && value) {
      patch.formaPagamento = normalizeValue(value);
    } else if (tokensCategoria.has(key) && value) {
      patch.categoria = isCategoriaVazia(value) ? null : normalizeValue(value);
    }

    index = nextIndex;
  }

  return patch;
}

function findNextKey(tokens: string[], start: number): number {
  for (let index = start; index < tokens.length; index += 1) {
    if (allTokens.has(normalizeToken(tokens[index]))) {
      return index;
    }
  }

  return tokens.length;
}

function normalizeToken(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function isCategoriaVazia(value: string): boolean {
  const normalized = normalizeToken(value).replace(/\s+/g, ' ').trim();
  return normalized === 'nenhuma' || normalized === 'sem categoria' || normalized === 'sem_categoria';
}

function normalizeValue(value: string): string {
  return normalizeToken(value).replace(/\s+/g, '_');
}
