// src/components/collaborators.js
import { brl } from "../utils/format.js";

export function renderCollaboratorsSummary(rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="card section" style="margin-top:12px">
        <h2>Resumo por Colaborador</h2>
        <div class="muted" style="margin-top:8px">Ainda não há itens para consolidar.</div>
      </div>
    `;
  }

  const totalGeral = rows.reduce((a, r) => a + r.gasto_comprado, 0);

  return `
    <div class="card section" style="margin-top:12px">
      <div class="row space-between">
        <h2>Resumo por Colaborador</h2>
        <div class="muted" style="font-size:12px">Total comprado: <b>${brl(totalGeral)}</b></div>
      </div>

      <div class="collaborators-table-wrap" style="margin-top:10px">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Itens adicionados</th>
              <th>Itens comprados</th>
              <th>Gasto (comprados)</th>
              <th>% do total</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                const pct =
                  totalGeral > 0
                    ? Math.round((r.gasto_comprado / totalGeral) * 100)
                    : 0;
                return `
                <tr>
                  <td style="font-weight:700">${r.nome}</td>
                  <td>${r.itens_adicionados}</td>
                  <td>${r.itens_comprados}</td>
                  <td><b>${brl(r.gasto_comprado)}</b></td>
                  <td>${pct}%</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="collaborators-mobile" style="margin-top:10px">
        ${rows
          .map((r) => {
            const pct =
              totalGeral > 0
                ? Math.round((r.gasto_comprado / totalGeral) * 100)
                : 0;
            return `
              <div class="collab-card">
                <div class="collab-name">${r.nome}</div>
                <div class="collab-stats">
                  <div class="collab-stat">
                    <div class="stat-label">Adicionados</div>
                    <div class="stat-value">${r.itens_adicionados}</div>
                  </div>
                  <div class="collab-stat">
                    <div class="stat-label">Comprados</div>
                    <div class="stat-value">${r.itens_comprados}</div>
                  </div>
                  <div class="collab-stat">
                    <div class="stat-label">Gasto</div>
                    <div class="stat-value">${brl(r.gasto_comprado)}</div>
                  </div>
                  <div class="collab-stat">
                    <div class="stat-label">% Total</div>
                    <div class="stat-value">${pct}%</div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}
