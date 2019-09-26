const locale = "us";

window.onload = async () => {
  const svg = d3.select("svg");
  const margin = { top: 50, bottom: 50, left: 50, right: 50 };
  const w = +svg.attr("width") - margin.left - margin.right;
  const h = +svg.attr("height") - margin.top - margin.bottom;

  const innerRadius = 100;
  const outerRadius = Math.min(w, h) / 2;

  const holidays  = await d3.csv("data/holidays.csv", (d) => parseDate(d.Date).getTime());
  const data      = await d3.csv("data/air_quality.csv", (d) => (
    { Date: parseDate(d.Date), DateRaw: parseDate(d.Date).getTime(), Temp: parseFloat(d.Temp) })
  );
  
  const g = svg.append("g")
    .attr("transform", `translate(${w / 2 + margin.left}, ${h / 2 + margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.DateRaw))
    .range([0, Math.PI * 2])
    .align(0);

  const y = d3.scaleRadial()
    .domain(d3.extent(data.map(d => d.Temp)))
    .range([innerRadius, outerRadius]);

  drawXAxis(g, data, holidays, x, innerRadius, outerRadius);
  drawYAxis(g, y);

  drawLegend(g, data);

  drawTempGraph(g, data, y);
}

const cleanupData = (d, i) => ({ Date: parseDate(d.Date), Temp: +d.Temp });

const parseDate = d3.timeParse("%Y-%m-%d");

const formatDate = (d) => (
  d.Date.toLocaleDateString(locale, { day: "numeric", month: "short" })
)

d3.scaleRadial = () => {
  const linear = d3.scaleLinear();
  const scale  = (x) => Math.sqrt(linear(x));
  const square = (x) => x * x;

  scale.domain  = (args) => args && args.length ? (linear.domain(args), scale)
                                                : linear.domain();

  scale.range   = (args) => args && args.length ? (linear.range(args.map(square)), scale)
                                                : linear.range().map(Math.sqrt);

  scale.ticks       = linear.ticks;
  scale.tickFormat  = linear.tickFormat;
  scale.nice        = (count) => (linear.nice(count), scale);

  return scale;
}

const drawXAxis = (g, data, holidays, x, innerRadius, outerRadius) => {
  const xAxis = g.append("g")
      .attr("class", "xAxis");

  const label = xAxis.selectAll("g")
    .data(data)
    .enter().append("g")
      .attr("transform", (d) => (
        `rotate(${((x(d.DateRaw)) * 180 / Math.PI - 90)})`
      ))

  label.append("line")
    .attr("class", "xtick")
    .attr("x1", innerRadius)
    .attr("x2", outerRadius)

  const labelMargin = 10;

  label.append("text")
    .classed("holiday", (d) => (holidays.includes(d.DateRaw)))
    .attr("text-anchor", (d, i) => (i < (data.length / 2) ? "start" : "end"))
    .attr("transform", (d, i) => (
        `rotate(${180 / data.length})
         translate(${outerRadius + labelMargin}, 0)
         rotate(${i < (data.length / 2) ? 0 : 180})`
    ))
    .text(d => formatDate(d));
}

const drawYAxis = (g, y) => {
  const yLevels = 11;

  const yAxis = g.append("g")
    .attr("class", "yAxis");

  const yTick = yAxis.selectAll("g")
    .data(y.ticks(yLevels))
    .enter().append("g");

  yTick.append("circle")
    .attr("class", "ytick")
    .classed("center", d => d === 0)
    .attr("r", y);

  //  yAxis
  //  //.selectAll("circle")
  //  //.data(data)
  //    .enter()
  //      .append("circle")
  //      .attr("cx", (d) => y(d.Temp))
  //  //.attr("cy", (d) => 
}

const drawLegend = (g, data) => {
  const [start, end] = d3.extent(data, d => d.Date);

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.toLocaleDateString(locale, { month: "short" });
  const endMonth = end.toLocaleDateString(locale, { month: "short" });

  const yearText = startYear === endYear ? startYear : `${startYear}   ${endYear}`;
  const monthText = `${startMonth} - ${endMonth}`;

  g.append("text")
      .attr("class", "legend")
    .append("tspan")
      .attr("class", "month")
      .text(monthText)
    .append("tspan")
      .attr("class", "year")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .text(yearText);
}

const drawTempGraph = (g, data, y) => {
  const xStep = Math.PI * 2.0 / data.length;
  const [innerRadius, _] = y.range();

  const line = d3.areaRadial()
    .angle((d, i) => i * xStep + xStep / 2)
    .innerRadius(innerRadius + 110)
    .outerRadius(d => y(d.Temp))
    .curve(d3.curveBasis)

  const lineGraph = g.append("g")
      .attr("class", "temp-graph")
    .append("path")
      .datum(data)
      .attr("d", line);
}
