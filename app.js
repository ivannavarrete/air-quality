const locale = "us";

window.onload = async () => {
  const svg = d3.select("svg");
  const margin = { top: 50, bottom: 50, left: 50, right: 50 };
  const w = +svg.attr("width") - margin.left - margin.right;
  const h = +svg.attr("height") - margin.top - margin.bottom;

  const outerRadius = Math.min(w, h) / 2;
  const innerRadius = Math.floor(outerRadius / 4 + 5);
  const stackGraphsRadius = innerRadius * 2;
  const stackGraphWidth = (stackGraphsRadius - innerRadius) / 5;

  const holidays  = await d3.csv("data/holidays.csv", (d) => parseDate(d.Date).getTime());
  const data      = await d3.csv("data/air_quality.csv", (d) => ({
      Date: parseDate(d.Date),
      DateRaw: parseDate(d.Date).getTime(),
      TEMP: parseFloat(d.Temp),
      CO: parseInt(d.CO),
      NO2: parseInt(d.NO2),
      SO2: parseInt(d.SO2),
      PM10: parseInt(d.PM10),
      PM2_5: parseInt(d.PM2_5)
    })
  );

  let gMain = svg.append("g")
    .attr("transform", `translate(${w / 2 + margin.left}, ${outerRadius + margin.top})`);

  const xStep = Math.PI * 2 / data.length;

  const x = d3.scaleBand()
    .domain(data.map(d => d.DateRaw))
    .range([xStep / 2, Math.PI * 2 - xStep / 2])
    .align(0);

  const y = d3.scaleLinear()
    .domain(d3.extent(data.map(d => d.TEMP)))
    .range([innerRadius + stackGraphWidth * 5, outerRadius]);

  drawXAxis(gMain, data, holidays, x, innerRadius, outerRadius);
  drawYAxis(gMain, y);

  drawLegend(gMain, data);

  const _gTooltips = d3.create("svg:g")
    .attr("class", "tooltips")

  const gTooltips = _gTooltips.selectAll("g")
    .data(data)
    .enter().append("g")
      .attr("class", d => `tooltip-${d.DateRaw}`)

  gGraphs = gMain.append("g").attr("class", "graphs");

  [["co",4],["no2",80],["so2",150],["pm10",150],["pm2_5",75]].forEach(([name, standard], i) => {
    const _innerRadius = innerRadius + stackGraphWidth * i;
    const _outerRadius = _innerRadius + stackGraphWidth;

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[name.toUpperCase()])])
      .range([_outerRadius, _innerRadius])

    drawStackGraph(name, data, _innerRadius, stackGraphWidth, x, y, gGraphs);
    drawStackYAxis(name, standard, y, gGraphs);
    drawTooltips(name, data, x, () => (_innerRadius + stackGraphWidth / 2), gTooltips);
  });

  const gTempGraph = gGraphs.append("g").attr("class", "temp-graph")
  drawTempGraph(gTempGraph, data, x, y);
  drawTooltips("temp", data, x, y, gTooltips);

  gMain.append(() => _gTooltips.node());

  bindEvents(data, x, y, () => drawTempGraph(gMain, data, x, y));
}

const drawTooltips = (name, data, x, y, g) => {
  const accessor = name.toUpperCase();

  g.append("text")
    .attr("transform", d => (`
      rotate(${rotateText(d, x)})
      translate(${y(d[accessor])}, 0)
      rotate(${-rotateText(d, x)})
    `))
    .text(d => d[accessor]);
}

const parseDate = d3.timeParse("%Y-%m-%d");

const formatDate = (d) => (
  d.Date.toLocaleDateString(locale, { day: "numeric", month: "short" })
)

const rotateText = (d, x) => (
  (x(d.DateRaw) + x.bandwidth() / 2 - Math.PI * 0.5) * 180 / Math.PI
);

const drawStackGraph = (name, data, innerRadius, width, x, y, g) => {
  const accessor = name.toUpperCase();

  const [min, max] = y.domain();
  const step = (max - min) / 5;

  const arc = d3.arc()
    .innerRadius(innerRadius + width)
    .outerRadius(d => y(d[accessor]))
    .startAngle(d => x(d.DateRaw))
    .endAngle(d => x(d.DateRaw) + x.bandwidth());

  const arcLevels = (n) => {
    const level = (d) => d3.max([y(step * n), y(d[accessor])])

    return d3.arc()
      .innerRadius(d => level(d))
      .outerRadius(d => level(d))
      .startAngle(d => x(d.DateRaw))
      .endAngle(d => x(d.DateRaw) + x.bandwidth())
  };

  const line = d3.lineRadial()
    .angle(d => x(d.DateRaw))
    .radius(d => y(d[accessor]))
    .curve(d3.curveStepAfter)

  const graph = g.append("g")
      .attr("class", `${name}-graph`)

  graph.selectAll("path")
    .data(data)
    .join("g")
      .call(g => g.append("path")
        .attr("class", "levels")
        .attr("d", arcLevels(1)))
      .call(g => g.append("path")
        .attr("class", "levels")
        .attr("d", arcLevels(2)))
      .call(g => g.append("path")
        .attr("class", "levels")
        .attr("d", arcLevels(3)))
      .call(g => g.append("path")
        .attr("class", "levels")
        .attr("d", arcLevels(4)))
      .call(g => g.append("path")
        .attr("class", "values")
        .attr("d", arc))

  graph.append("g")
      .attr("class", "y-axis")
    .append("circle")
      .attr("class", "ytick ytick-inner")
      .attr("r", innerRadius)
}

const drawXAxis = (g, data, holidays, x, innerRadius, outerRadius) => {
  const hitBox = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(d => x(d.DateRaw))
      .endAngle(d => x(d.DateRaw) + x.bandwidth())

  const xAxis = g.append("g")
      .attr("class", "x-axis");

  const xTick = xAxis.selectAll("g")
    .data(data)
    .enter().append("g")

  xTick.append("path")
      .attr("class", "hitbox")
      .attr("d", hitBox);

  const labelMargin = 10;
  const inRightHalf = (i) => (i < (data.length / 2));

  xTick.append("text")
      .classed("holiday", d => holidays.includes(d.DateRaw))
      .attr("text-anchor", (_, i) => inRightHalf(i) ? "start" : "end")
      .attr("transform", (d, i) => (`
         rotate(${rotateText(d, x)})
         translate(${outerRadius + labelMargin}, 0)
         rotate(${inRightHalf(i) ? 0 : 180})
      `))
      .text(d => formatDate(d));
}

const drawStackYAxis = (name, standard, y, g) => {
  const pollutantAxis = g.append("g")
    .attr("class", "y-axis");

  pollutantAxis.append("circle")
    .attr("class", "pollutant-standard")
    .attr("r", y(standard));

  pollutantAxis.append("text")
    .attr("class", name)
    .attr("y", -y(standard))
    .attr("dy", "0.35em")
    .text(standard);
}

const drawYAxis = (g, y) => {
  const yLevels = 10;
  const [innerRadius, outerRadius] = y.range();

  const yTick = d3.lineRadial()
      .angle(d => x(d.DateRaw) + x.bandwidth() / 2)
      .radius(d => y(d))

  const yAxis = g.append("g")
    .attr("class", "y-axis");

  yAxis.append("circle")
      .attr("class", "ytick ytick-inner")
      .attr("r", innerRadius);

  yAxis.call(g => g.selectAll("g")
    .data(y.ticks(yLevels))
    //.data([-20, -15, -10, -5, 0, 5, 10, 15])
    .join("g")
      .call(g => g.append("circle")
          .attr("class", "ytick")
          .classed("ytick-center", d => d === 0)
          .attr("r", y))
      .call(g => g.append("text")
          .attr("class", "temp")
          .attr("y", d => -y(d))
          .attr("dy", "0.35em")
          .text(d => d)))

  yAxis.append("circle")
      .attr("class", "ytick ytick-outer")
      .attr("r", outerRadius);
}

const drawLegend = (g, data) => {
  const [start, end] = d3.extent(data, d => d.Date);

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.toLocaleDateString(locale, { month: "short" });
  const endMonth = end.toLocaleDateString(locale, { month: "short" });

  const yearText = startYear === endYear ? startYear : `${startYear}   ${endYear}`;
  const monthText = `${startMonth} - ${endMonth}`;

  const legend = g.append("text")
      .attr("class", "legend")

  legend.append("tspan")
      .attr("class", "month")
      .text(monthText);

  legend.append("tspan")
      .attr("class", "year")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .text(yearText);
}

const drawTempGraph = (g, data, x, y) => {
  const [innerRadius, _] = y.range();

  const graph = d3.areaRadial()
      .angle(d => x(d.DateRaw) + x.bandwidth() / 2)
      .innerRadius(y(0))
      .outerRadius(d => y(d.TEMP))
      .curve(d3.curveCatmullRom)

  const lineGraph = g.append("path")
      .datum(data)
      .attr("d", graph);
}

const bindEvents = (data, x, y, redraw) => {
  d3.selectAll(".x-axis .hitbox")
    .on("mouseenter", function(d) {
      d3.select(this.parentElement).raise();

      d3.selectAll(`.tooltip-${d.DateRaw}`)
        .classed("show", true)
    })
    .on("mouseleave", d => {
      d3.selectAll(`.tooltip-${d.DateRaw}`)
        .classed("show", false)
    })
}
