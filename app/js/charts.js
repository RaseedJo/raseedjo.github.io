// Charts for the dashboard (Chart.js 4.5.1, copied into app/vendor/).
// Chart.js is only downloaded when the dashboard is opened, so other pages stay fast.
//
// Style rules (from the data-visualisation guidance used for this app):
// one colour per chart (the title says what it shows, so no legend), bars at most
// 24px thick with 4px rounded ends, solid hairline gridlines, values at bar tips,
// tooltips that lead with the value, and a table view under every chart.

const CHART_SRC = "vendor/chart.js-4.5.1/chart.umd.min.js";

export const CHART_COLORS = {
  mark: "#008F85",       // a slightly brighter brand teal; passes the palette checks on the card surface
  markHover: "#00A497",
  grid: "#ECE5DA",
  axis: "#586E6C",       // muted text colour (4.8:1)
  value: "#0B2A29",      // text colour for value labels
  tooltipBg: "#0B2A29",
  tooltipText: "#FBF5EC",
  tooltipMuted: "#C2CDC6",
};

let loading = null;

/** Load Chart.js once. Resolves with window.Chart. */
export function loadChartLib() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHART_SRC;
      script.async = true;
      script.onload = () => (window.Chart ? resolve(window.Chart) : reject(new Error("Chart.js did not load")));
      script.onerror = () => {
        loading = null; // let a later visit try again
        reject(new Error("Chart.js could not be downloaded"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Writes each bar's value just past its end (selective labels on short bar lists). */
const valueLabels = {
  id: "valueLabels",
  afterDatasetsDraw(chart, args, options) {
    if (!options || !options.format) return;
    const { ctx } = chart;
    const values = chart.data.datasets[0].data;
    ctx.save();
    ctx.font = `600 12px ${options.font}`;
    ctx.fillStyle = CHART_COLORS.value;
    ctx.textBaseline = "middle";
    ctx.direction = options.rtl ? "rtl" : "ltr";
    ctx.textAlign = options.rtl ? "right" : "left";
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const x = options.rtl ? bar.x - 8 : bar.x + 8;
      ctx.fillText(options.format(values[i]), x, bar.y);
      // Names above their bars, so long names don't squeeze the bars on phones
      if (options.namesAbove) {
        ctx.font = `500 12px ${options.font}`;
        ctx.fillStyle = CHART_COLORS.axis;
        ctx.textBaseline = "bottom";
        ctx.fillText(options.names[i], bar.base, bar.y - bar.height / 2 - 4);
        ctx.font = `600 12px ${options.font}`;
        ctx.fillStyle = CHART_COLORS.value;
        ctx.textBaseline = "middle";
      }
    });
    ctx.restore();
  },
};

function baseOptions({ rtl, font }) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion() ? false : { duration: 450 },
    locale: "en-US", // Western digits in both languages
    plugins: {
      legend: { display: false },
      tooltip: {
        rtl,
        textDirection: rtl ? "rtl" : "ltr",
        backgroundColor: CHART_COLORS.tooltipBg,
        titleColor: CHART_COLORS.tooltipMuted,
        bodyColor: CHART_COLORS.tooltipText,
        titleFont: { family: font, size: 12, weight: "500" },
        bodyFont: { family: font, size: 14, weight: "600" },
        displayColors: false,
        padding: 10,
        cornerRadius: 8,
        caretSize: 5,
      },
    },
  };
}

function bar(data) {
  return {
    data,
    backgroundColor: CHART_COLORS.mark,
    hoverBackgroundColor: CHART_COLORS.markHover,
    borderRadius: 4,
    borderSkipped: "start", // square at the baseline, rounded at the data end
    maxBarThickness: 24,
  };
}

/** Daily sales: one column per day, newest on the inline end. */
export function salesChart(Chart, canvas, { labels, tooltipTitles, values, rtl, font, formatValue, formatTick }) {
  const narrow = canvas.parentElement.clientWidth < 480;
  const options = baseOptions({ rtl, font });
  options.interaction = { mode: "index", intersect: false }; // aim at the day, not the 8px bar
  options.plugins.tooltip.callbacks = {
    title: (items) => tooltipTitles[items[0].dataIndex],
    label: (item) => formatValue(values[item.dataIndex]),
  };
  options.scales = {
    x: {
      reverse: rtl,
      grid: { display: false },
      border: { color: CHART_COLORS.grid },
      ticks: { color: CHART_COLORS.axis, font: { family: font, size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: narrow ? 4 : 7 },
    },
    y: {
      position: rtl ? "right" : "left",
      beginAtZero: true,
      grace: "8%",
      border: { display: false },
      grid: { color: CHART_COLORS.grid, lineWidth: 1, drawTicks: false },
      ticks: { color: CHART_COLORS.axis, font: { family: font, size: 11 }, maxTicksLimit: 5, padding: 8, callback: formatTick },
    },
  };
  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ ...bar(values.map((v) => v / 1000)), categoryPercentage: 0.85, barPercentage: 0.9 }] },
    options,
  });
}

/** Horizontal bars with the value written at each tip (status counts, top products). */
export function horizontalBars(Chart, canvas, { labels, values, rtl, font, formatValue, labelMax = 22, room = 72, namesAbove = false }) {
  const options = baseOptions({ rtl, font });
  options.indexAxis = "y";
  // Leave room past the longest bar for its value label (and above the first bar for its name)
  options.layout = { padding: rtl ? { left: room, right: 4, top: namesAbove ? 18 : 0 } : { right: room, left: 4, top: namesAbove ? 18 : 0 } };
  options.plugins.tooltip.callbacks = {
    title: (items) => labels[items[0].dataIndex],
    label: (item) => formatValue(values[item.dataIndex]),
  };
  options.plugins.valueLabels = { format: formatValue, rtl, font, namesAbove, names: labels };
  options.scales = {
    x: { reverse: rtl, beginAtZero: true, display: false, grid: { display: false } },
    y: {
      display: !namesAbove,
      position: rtl ? "right" : "left",
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: CHART_COLORS.value,
        font: { family: font, size: 12 },
        padding: 6,
        callback: (value, index) => {
          const label = labels[index];
          return label.length > labelMax ? `${label.slice(0, labelMax - 1)}…` : label;
        },
      },
    },
  };
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [namesAbove
        ? { ...bar(values), maxBarThickness: 16, categoryPercentage: 0.9, barPercentage: 0.55 }
        : { ...bar(values), categoryPercentage: 0.8, barPercentage: 0.85 }],
    },
    options,
    plugins: [valueLabels],
  });
}
