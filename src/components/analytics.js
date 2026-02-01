// src/components/analytics.js
export function renderAnalytics() {
  return `
  <div class="card section" style="margin-top:12px">
    <div class="row space-between">
      <div>
        <h2>Analytics</h2>
        <div class="muted" style="font-size:12px;margin-top:4px">
          Faixas de preço + evolução mensal + pendente vs comprado
        </div>
      </div>
    </div>

    <div class="analytics-stack" style="margin-top:12px">
      <div class="card section">
        <h3>Distribuição de preços (unitário)</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Até 10 • 10–50 • Acima 50</div>
        <div class="chart-box">
          <canvas id="chartPrice"></canvas>
        </div>
      </div>

      <div class="card section">
        <h3>Evolução mensal de gastos</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Total (R$) por período</div>
        <div class="chart-box">
          <canvas id="chartMonthly"></canvas>
        </div>
      </div>

      <div class="card section">
        <h3>Pendentes vs Comprados</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Por quantidade de itens</div>
        <div class="chart-box">
          <canvas id="chartStatus"></canvas>
        </div>
      </div>
    </div>
  </div>
  `;
}

export function buildCharts() {
  const ctxPrice = document.getElementById("chartPrice");
  const ctxMonthly = document.getElementById("chartMonthly");
  const ctxStatus = document.getElementById("chartStatus");

  // Verifica se os elementos existem no DOM
  if (!ctxPrice || !ctxMonthly || !ctxStatus) {
    console.warn("Elementos canvas não encontrados no DOM");
    return null;
  }

  const priceChart = new Chart(ctxPrice, {
    type: "bar",
    data: {
      labels: ["Até R$ 10", "R$ 10–50", "Acima de R$ 50"],
      datasets: [{ label: "Itens", data: [0, 0, 0] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  const valueLabelPlugin = {
    id: "valueLabel",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const dataset = chart.data.datasets?.[0];
      if (!dataset) return;

      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;

      ctx.save();
      ctx.font = "600 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      meta.data.forEach((point, i) => {
        const raw = dataset.data?.[i] ?? 0;
        const value = Number(raw || 0);
        const text = value.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        const paddingX = 6;
        const paddingY = 3;
        const radius = 8;
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 18;

        const x = point.x;
        const y = point.y - 16;

        // linha sutil e curta
        ctx.strokeStyle = "rgba(148,163,184,0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, point.y - 4);
        ctx.lineTo(x, y + boxHeight + 2);
        ctx.stroke();

        // pill
        const left = x - boxWidth / 2;
        const top = y - boxHeight;
        ctx.fillStyle = "rgba(11,14,20,0.94)";
        ctx.beginPath();
        ctx.moveTo(left + radius, top);
        ctx.lineTo(left + boxWidth - radius, top);
        ctx.quadraticCurveTo(left + boxWidth, top, left + boxWidth, top + radius);
        ctx.lineTo(left + boxWidth, top + boxHeight - radius);
        ctx.quadraticCurveTo(
          left + boxWidth,
          top + boxHeight,
          left + boxWidth - radius,
          top + boxHeight,
        );
        ctx.lineTo(left + radius, top + boxHeight);
        ctx.quadraticCurveTo(left, top + boxHeight, left, top + boxHeight - radius);
        ctx.lineTo(left, top + radius);
        ctx.quadraticCurveTo(left, top, left + radius, top);
        ctx.closePath();
        ctx.fill();

        // texto
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, top + boxHeight / 2);
      });

      ctx.restore();
    },
  };

  const monthlyChart = new Chart(ctxMonthly, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Total (R$)", data: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        valueLabel: true,
      },
    },
    plugins: [valueLabelPlugin],
  });

  const statusChart = new Chart(ctxStatus, {
    type: "doughnut",
    data: { labels: ["Pendentes", "Comprados"], datasets: [{ data: [0, 0] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  return { priceChart, monthlyChart, statusChart };
}

export function updateCharts({
  charts,
  priceBuckets,
  monthlySeries,
  statusCounts,
}) {
  // Se os gráficos não foram inicializados, não tenta atualizar
  if (!charts) return;
  charts.priceChart.data.datasets[0].data = [
    priceBuckets.at10,
    priceBuckets.between10and50,
    priceBuckets.above50,
  ];
  charts.priceChart.update();

  charts.monthlyChart.data.labels = monthlySeries.labels;
  charts.monthlyChart.data.datasets[0].data = monthlySeries.values;
  charts.monthlyChart.update();

  charts.statusChart.data.datasets[0].data = [
    statusCounts.pending,
    statusCounts.bought,
  ];
  charts.statusChart.update();
}
