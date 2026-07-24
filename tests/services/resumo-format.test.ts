import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatFormaPagamento } from '../../src/services/resumo.service.js';

describe('formatFormaPagamento', () => {
  it('formata pagamento à vista', () => {
    assert.equal(
      formatFormaPagamento({
        nome: 'pix',
        dsDescricao: null,
        vlTotal: '40550.00',
        qtParcelasTotal: null,
        vlParcela: null,
      }),
      '- pix: R$ 40.550,00',
    );
  });

  it('formata pagamento parcelado com total e valor da parcela', () => {
    assert.equal(
      formatFormaPagamento({
        nome: 'cartao',
        dsDescricao: 'servidor particular',
        vlTotal: '2059.00',
        qtParcelasTotal: 10,
        vlParcela: '205.90',
      }),
      '- cartao R$ 2.059,00 em 10x de R$ 205,90 — servidor particular',
    );
  });
});
