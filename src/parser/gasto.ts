const formasCompostas: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bcart[aã]o\s+de\s+cr[eé]dito\b/i, value: 'credito' },
  { pattern: /\bcart[aã]o\s+de\s+d[eé]bito\b/i, value: 'debito' },
];

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

export type GastoParseResult = {
  valor: number;
  descricao: string;
  categoria: string | null;
  formaPagamento: string | null;
  qtParcelas: number | null;
  pessoaGastoNome: string | null;
};

export function parseValor(raw: string): number | null {
  const normalized = raw.replace(/r\$/i, '').replace(/\./g, '').replace(',', '.').trim();
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

export function parseGastoCommand(text: string): GastoParseResult | null {
  const cleaned = text.trim().replace(/^!?gasto\s+/i, '');

  if (cleaned === text.trim()) {
    return null;
  }

  return buildParseResult(cleaned);
}

export function parseGastoNatural(text: string): GastoParseResult | null {
  const normalized = text.trim();

  if (!/(gastei|gastou|paguei|pagou|comprei|comprou)/i.test(normalized)) {
    return null;
  }

  return buildParseResult(normalized.replace(/\b(gastei|gastou|paguei|pagou|comprei|comprou)\b/i, '').trim());
}

function buildParseResult(rawText: string): GastoParseResult | null {
  const valueMatch = rawText.match(/(?:r\$\s*)?(\d+(?:\.\d{3})*(?:[,.]\d{1,2})?|\d+)/i);

  if (!valueMatch || valueMatch.index === undefined) {
    return null;
  }

  const valor = parseValor(valueMatch[1]);

  if (valor === null) {
    return null;
  }

  const beforeValue = rawText.slice(0, valueMatch.index);
  const afterValue = rawText.slice(valueMatch.index + valueMatch[0].length);
  const pessoaGastoNome = extrairPessoa(beforeValue);
  let descriptionSource = `${removerPessoa(beforeValue, pessoaGastoNome)} ${afterValue}`;
  const qtParcelas = extrairParcelas(rawText);
  const categoria = extrairCategoriaExplicita(descriptionSource);
  const formaPagamento = extrairFormaPagamento(descriptionSource) ?? (qtParcelas ? 'cartao' : null);

  descriptionSource = removerCategoriaExplicita(descriptionSource);
  descriptionSource = removerParcelamento(descriptionSource);
  descriptionSource = removerFormaPagamento(descriptionSource);
  descriptionSource = removerRuidoMonetario(descriptionSource);

  const descricao = normalizarDescricao(descriptionSource) || 'sem descrição';

  return {
    valor,
    descricao,
    categoria,
    formaPagamento,
    qtParcelas,
    pessoaGastoNome,
  };
}

function extrairPessoa(beforeValue: string): string | null {
  const words = beforeValue.split(/\s+/).map((word) => word.replace(/[.,;:!?()[\]{}]/g, '')).filter(Boolean);
  const pessoa = words.find((word) => !['para', 'pra', 'pro', 'de', 'do', 'da', 'no', 'na', 'em'].includes(word.toLowerCase()));

  return pessoa ? capitalize(pessoa) : null;
}

function removerPessoa(text: string, pessoa: string | null): string {
  if (!pessoa) {
    return text;
  }

  return text.replace(new RegExp(`\\b${escapeRegExp(pessoa)}\\b`, 'i'), ' ');
}

function extrairParcelas(text: string): number | null {
  const match = text.match(/(?:parcelad[oa]\s+)?(?:em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas|prestacoes|prestações)\b/i);

  if (!match) {
    return null;
  }

  const qtParcelas = Number(match[1]);

  if (!Number.isInteger(qtParcelas) || qtParcelas < 2 || qtParcelas > 48) {
    return null;
  }

  return qtParcelas;
}

function extrairFormaPagamento(text: string): string | null {
  for (const { pattern, value } of formasCompostas) {
    if (pattern.test(text)) {
      return value;
    }
  }

  const words = text.split(/\s+/).map((word) => word.replace(/[.,;:!?()[\]{}]/g, '').toLowerCase()).filter(Boolean);

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

function removerParcelamento(text: string): string {
  return text.replace(/\b(?:parcelad[oa]\s+)?(?:em\s+)?\d{1,2}\s*(?:x|vezes|parcelas|prestacoes|prestações)\b/gi, ' ');
}

function removerFormaPagamento(text: string): string {
  let result = text;

  for (const { pattern } of formasCompostas) {
    result = result.replace(pattern, ' ');
  }

  return result
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
