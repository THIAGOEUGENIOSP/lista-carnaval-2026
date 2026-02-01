# Ajuste: Edicao inline no desktop (V. Unit e Qtd)

## O que foi feito
- Removidos os botoes de lapis na tabela desktop para Qtd e V. Unit.
- O valor virou clicavel (o clique agora abre o input inline, igual no mobile).
- Adicionado cursor de clique no valor para indicar interacao.

## Onde foi alterado
- `src/components/itemList.js`
  - Qtd: o `span` que mostra o valor passou a ter `data-action="edit-cell"` e `data-field="quantidade"`.
  - V. Unit: o `span` que mostra o valor passou a ter `data-action="edit-cell"` e `data-field="valor_unitario"`.
  - Removidos os botoes de lapis.

- `src/styles.css`
  - `.editing-cell [data-view] { cursor: pointer; }` para indicar que o valor e clicavel.

## Resultado
- No desktop, basta clicar no valor de Qtd ou V. Unit para editar inline, sem botoes extras.
