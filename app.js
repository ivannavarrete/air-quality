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
      Temp: parseFloat(d.Temp),
      CO: parseInt(d.CO),
      NO2: parseInt(d.NO2),
      SO2: parseInt(d.SO2),
      PM10: parseInt(d.PM10),
      PM2_5: parseInt(d.PM2_5)
    })
  );

  const g = svg.append("g")
    .attr("transform", `translate(${w / 2 + margin.left}, ${outerRadius + margin.top})`);

  const xStep = Math.PI * 2 / data.length;

  const x = d3.scaleBand()
    .domain(data.map(d => d.DateRaw))
    .range([xStep / 2, Math.PI * 2 - xStep / 2])
    .align(0);

  const y = d3.scaleLinear()
    .domain(d3.extent(data.map(d => d.Temp)))
    .range([innerRadius + stackGraphWidth * 5, outerRadius]);

  drawXAxis(g, data, holidays, x, innerRadius, outerRadius);
  drawYAxis(g, y);

  drawLegend(g, data);

  ["co", "no2", "so2", "pm10", "pm2_5"].forEach((name, i) => {
    drawStackGraph(name, data.map(d => d[name.toUpperCase()]), innerRadius + stackGraphWidth * i, stackGraphWidth, g);
  });

  drawTempGraph(g, data, y, "temp");
}

const parseDate = d3.timeParse("%Y-%m-%d");

const formatDate = (d) => (
  d.Date.toLocaleDateString(locale, { day: "numeric", month: "short" })
)

const drawStackGraph = (name, data, innerRadius, width, g) => {
  const xStep = Math.PI * 2 / data.length;

  const x = d3.scaleLinear()
      .domain([0, data.length])
      .range([xStep / 2, Math.PI * 2 - xStep / 2]);

  const y = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .range([innerRadius + width, innerRadius]);

  const arc = d3.arc()
      .innerRadius(innerRadius + width)
      .outerRadius(d => y(d))
      .startAngle((d, i) => x(i))
      .endAngle((d, i) => x(i) + xStep);

  const graph = g.append("g")
      .attr("class", `${name}-graph`)

  graph.selectAll("path")
    .data(data)
    .enter().append("path")
        .attr("d", arc);

  graph.append("g")
      .attr("class", "y-axis")
    .append("circle")
      .attr("class", "ytick ytick-inner")
      .attr("r", innerRadius)
}

const drawXAxis = (g, data, holidays, x, innerRadius, outerRadius) => {
  const labelMargin = 10;

  const xAxis = g.append("g")
      .attr("class", "x-axis");

  const xTick = xAxis.selectAll("g")
    .data(data)
    .enter().append("g")
      .attr("transform", (d) => `rotate(${x(d.DateRaw) * 180 / Math.PI - 90})`)

  xTick.append("line")
      .attr("class", "xtick")
      .attr("x1", innerRadius)
      .attr("x2", outerRadius)

  xTick.append("text")
      .classed("holiday", (d) => (holidays.includes(d.DateRaw)))
      .attr("text-anchor", (d, i) => (i < (data.length / 2) ? "start" : "end"))
      .attr("transform", (d, i) => (
          `rotate(${180 / data.length})
           translate(${outerRadius + labelMargin}, 0)
           rotate(${i < (data.length / 2) ? 0 : 180})`
      ))
      .text(d => formatDate(d));

  const xLegend = xAxis.append("g")
      .attr("transform", `rotate(${(270 - 360 / data.length / 2)})`)

  xLegend.append("line")
      .attr("class", "xtick")
      .attr("x1", innerRadius)
      .attr("x2", outerRadius)
}

const drawYAxis = (g, y) => {
  const yLevels = 10;
  const [innerRadius, outerRadius] = y.range();

  const yAxis = g.append("g")
    .attr("class", "y-axis");

  yAxis.append("circle")
      .attr("class", "ytick ytick-inner")
      .attr("r", innerRadius);

  yAxis.selectAll("circle")
    .data(y.ticks(yLevels))
    .enter().append("circle")
      .attr("class", "ytick")
      .classed("ytick-center", d => d === 0)
      .attr("r", y);

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

const drawTempGraph = (g, data, y) => {
  const xStep = Math.PI * 2.0 / data.length;
  const [innerRadius, _] = y.range();

  const graph = d3.areaRadial()
    .angle((d, i) => i * xStep + xStep / 2)
    .innerRadius(y(0))
    .outerRadius(d => y(d.Temp))
    .curve(d3.curveCatmullRom)
  //.defined((d, i) => d.Temp > 0)

  const lineGraph = g.append("g")
      .attr("class", "temp-graph")
    .append("path")
      .datum(data)
      .attr("d", graph);
}
