import { parseValor } from './gasto.js';

const formasPagamento = new Map([
  ['pix', 'pix'],
  ['cartao', 'cartao'],
  ['cartão', 'cartao'],
  ['credito', 'credito'],
  ['crédito', 'credito'],
  ['debito', 'debito'],
  ['débito', 'debito'],
  ['dinheiro', 'dinheiro'],
  ['boleto', 'boleto'],
  ['transferencia', 'transferencia'],
  ['transferência', 'transferencia'],
]);

export type RecorrenciaParseResult = {
  descricao: string;
  valor: number;
  nrDiaCobranca: number;
  categoria: string | null;
  formaPagamento: string | null;
  pessoaGastoNome: string | null;
};

export function parseRecorrenciaCriar(texto: string): RecorrenciaParseResult | null {
  const cleaned = texto.trim();

  if (!cleaned) {
    return null;
  }

  const nrDiaCobranca = extrairDia(cleaned);

  if (nrDiaCobranca === null) {
    return null;
  }

  const valueMatch = cleaned.match(/(?:r\$\s*)?(\d+(?:\.\d{3})*(?:[,.]\d{1,2})?|\d+)/i);

  if (!valueMatch || valueMatch.index === undefined) {
    return null;
  }

  const valor = parseValor(valueMatch[1]);

  if (valor === null) {
    return null;
  }

  const beforeValue = cleaned.slice(0, valueMatch.index);
  const afterValue = cleaned.slice(valueMatch.index + valueMatch[0].length);

  const pessoaGastoNome = extrairPessoa(beforeValue);
  let descriptionSource = `${removerPessoa(beforeValue, pessoaGastoNome)} ${afterValue}`;

  const categoria = extrairCategoriaExplicita(descriptionSource);
  const formaPagamento = extrairFormaPagamento(descriptionSource);

  descriptionSource = removerCategoriaExplicita(descriptionSource);
  descriptionSource = removerDia(descriptionSource);
  descriptionSource = removerFormaPagamento(descriptionSource);
  descriptionSource = removerRuidoMonetario(descriptionSource);

  const descricao = normalizarDescricao(descriptionSource) || 'sem descrição';

  return {
    descricao,
    valor,
    nrDiaCobranca,
    categoria,
    formaPagamento,
    pessoaGastoNome,
  };
}

function extrairDia(text: string): number | null {
  const match = text.match(/(?:todo\s+)?(?:no\s+)?dia\s+(\d{1,2})\b/i);

  if (!match) {
    return null;
  }

  const dia = Number(match[1]);

  if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
    return null;
  }

  return dia;
}

function removerDia(text: string): string {
  return text.replace(/(?:todo\s+)?(?:no\s+)?dia\s+\d{1,2}\b/gi, ' ');
}

function extrairPessoa(beforeValue: string): string | null {
  const words = beforeValue
    .split(/\s+/)
    .map((word) => word.replace(/[.,;:!?()[\]{}]/g, ''))
    .filter(Boolean);

  const pessoa = words.find(
    (word) => !['para', 'pra', 'pro', 'de', 'do', 'da', 'no', 'na', 'em'].includes(word.toLowerCase()),
  );

  return pessoa ? capitalize(pessoa) : null;
}

function removerPessoa(text: string, pessoa: string | null): string {
  if (!pessoa) {
    return text;
  }

  return text.replace(new RegExp(`\\b${escapeRegExp(pessoa)}\\b`, 'i'), ' ');
}

function extrairFormaPagamento(text: string): string | null {
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/[.,;:!?()[\]{}]/g, '').toLowerCase())
    .filter(Boolean);

  for (const word of words) {
    const forma = formasPagamento.get(word);

    if (forma) {
      return forma;
    }
  }

  return null;
}

function extrairCategoriaExplicita(text: string): string | null {
  const match = text.match(/\b(?:categoria|cat)\s+([^.,;!?]+)$/i);

  if (!match) {
    return null;
  }

  return normalizeValue(match[1]);
}

function removerCategoriaExplicita(text: string): string {
  return text.replace(/\b(?:categoria|cat)\s+[^.,;!?]+$/i, ' ');
}

function removerFormaPagamento(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => {
      const normalized = word.replace(/[.,;:!?()[\]{}]/g, '').toLowerCase();
      return !formasPagamento.has(normalized) && !['no', 'na'].includes(normalized);
    })
    .join(' ');
}

function removerRuidoMonetario(text: string): string {
  return text
    .replace(/\br\$\b/gi, ' ')
    .replace(/\b(reais|real)\b/gi, ' ')
    .replace(/\b(no|na|em|para|pra|pro|por|de)\b\s*$/gi, ' ');
}

function normalizarDescricao(text: string): string {
  return text
    .replace(/\b(no|na|em|para|pra|pro|por|de)\b\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeValue(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '_');
}

function capitalize(value: string): string {
  const normalized = value.trim();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
