const locale = "us";

let outerRadius = null;
let innerRadius = null;
let stackGraphsRadius = null;
let stackGraphWidth = null;

let holidays = [];
let data = [];

window.onload = async () => {
  const svg = d3.select("svg");
  const margin = { top: 50, bottom: 50, left: 50, right: 50 };
  const w = +svg.attr("width") - margin.left - margin.right;
  const h = +svg.attr("height") - margin.top - margin.bottom;

  outerRadius = Math.min(w, h) / 2;
  innerRadius = Math.floor(outerRadius / 4 + 5);
  stackGraphsRadius = innerRadius * 2 + 20;
  stackGraphWidth = (stackGraphsRadius - innerRadius) / 5;

  holidays  = await d3.csv("data/holidays.csv", (d) => parseDate(d.Date).getTime());
  data      = await d3.csv("data/air_quality.csv", (d) => ({
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


  const g = svg.append("g")
    .attr("transform", `translate(${w / 2 + margin.left}, ${outerRadius + margin.top})`);

  g.append("g").attr("class", "x-axis");
  g.append("g").attr("class", "y-axis");

  g.append("g").attr("class", "graphs")
    .selectAll("g")
    .data(["co", "no2", "so2", "pm10", "pm2_5", "temp"])
    .join("g")
      .attr("class", d => `${d}-graph`)

  g.select(".temp-graph").append("g").attr("class", "graph");

  g.append("g").attr("class", "tooltips")
  g.append("text").attr("class", "legend")

  draw(data, holidays);
}

const draw = (data, holidays) => {
  const g = d3.select("svg g");

  const xStep = Math.PI * 2 / data.length;

  const x = d3.scaleBand()
    .domain(data.map(d => d.DateRaw))
    .range([xStep / 2, Math.PI * 2 - xStep / 2])
    .align(0);

  const y = d3.scaleLinear()
    .domain(d3.extent(data.map(d => d.TEMP)))
    .range([innerRadius + stackGraphWidth * 5, outerRadius])
    .nice();

  const _gTooltips = d3.select(".tooltips").selectAll("g")
    .data(data, d => d.Date)

  _gTooltips.exit().remove()

  const gTooltips = _gTooltips
    .enter().append("g")
      .attr("class", d => `tooltip-${d.DateRaw}`);

  drawXAxis(data, holidays, x, innerRadius, outerRadius);
  drawYAxis(data, y);
  drawTempGraph(data, x, y);
  drawLegend(data);

  [["co",4],["no2",80],["so2",150],["pm10",150],["pm2_5",75]].forEach(([name, standard], i) => {
    const _innerRadius = innerRadius + stackGraphWidth * i;
    const _outerRadius = _innerRadius + stackGraphWidth;

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[name.toUpperCase()])])
      .range([_outerRadius, _innerRadius])

    drawStackGraph(name, data, x, y);
    drawStackYAxis(name, standard, y);
    drawTooltips(data, x, () => (_innerRadius + stackGraphWidth / 2), name, gTooltips);
  });

  drawTooltips(data, x, y, "temp", gTooltips);

  bindEvents(data, x, y);
}

const drawTooltips = (data, x, y, name, g) => {
  const accessor = name.toUpperCase();

  g.append("text")
    .attr("transform", d => (`
      rotate(${rotateText(d, x)})
      translate(${y(d[accessor])}, 0)
      rotate(${-rotateText(d, x)})
    `))
    .text(d => d[accessor]);
}

const drawStackGraph = (name, data, x, y) => {
  const accessor = name.toUpperCase();

  const [min, max] = y.domain();
  const step = (max - min) / 5;

  const graph = d3.arc()
    .innerRadius(d => y(0))
    .outerRadius(d => y(d[accessor]))
    .startAngle(d => x(d.DateRaw))
    .endAngle(d => x(d.DateRaw) + x.bandwidth());

  const _data = data.map(d => [d, d]).reduce((a, v) => a.concat(v), []);

  const _x = d3.scaleLinear()
    .domain([0, _data.length])
    .range(x.range())

  const levels = (n) => (
    d3.lineRadial()
      .radius(d => y(step * n))
      .angle((d, i) => _x(i % 2 === 1 ? i + 1: i))
      .defined(d => y(d[accessor]) < y(step * n))
  )

  d3.select(`.${name}-graph`).selectAll(".graph")
    .data([_data])
    .join(
      enter => enter.append("g")
        .attr("class", "graph")
        .call(g => {
          g.append("path").attr("class", "level")
          g.append("path").attr("class", "level")
          g.append("path").attr("class", "level")
          g.append("path").attr("class", "level")
      })
    )
    .call(g => {
      g.select(".level:nth-child(1)").attr("d", levels(1))
      g.select(".level:nth-child(2)").attr("d", levels(2))
      g.select(".level:nth-child(3)").attr("d", levels(3))
      g.select(".level:nth-child(4)").attr("d", levels(4))
    })
    .call(g =>
      g.selectAll(".value")
        .data(data)
        .join(
          enter => enter.append("path")
            .attr("class", "value")
        )
        .attr("d", graph)
    )
}

const drawXAxis = (data, holidays, x, innerRadius, outerRadius) => {
  const hitBox = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(d => x(d.DateRaw))
    .endAngle(d => x(d.DateRaw) + x.bandwidth())

  const labelMargin = 10;
  const inRightHalf = (i) => (i < (data.length / 2));

  d3.select(".x-axis").selectAll("g")
    .data(data)
    .join(
      enter => enter.append("g")
        .call(g => g.append("path").attr("class", "hitbox"))
        .call(g => g.append("text")),
    )
    .call(g => g.select("path").attr("d", hitBox))
    .call(g => g.select("text")
      .classed("holiday", d => holidays.includes(d.DateRaw))
      .attr("text-anchor", (d, i) => inRightHalf(i) ? "start" : "end")
      .attr("transform", (d, i) => (`
         rotate(${rotateText(d, x)})
         translate(${outerRadius + labelMargin}, 0)
         rotate(${inRightHalf(i) ? 0 : 180})
      `))
      .text(d => formatDate(d.Date))
    );
}

const drawStackYAxis = (name, standard, y) => {
  d3.select(`.${name}-graph`).selectAll(".y-axis")
    .data([name])
    .join(
      enter => enter.append("g")
        .attr("class", "y-axis")
        .call(g => {
          g.append("circle")
            .attr("class", "ytick ytick-inner")
            .attr("r", d3.min(y.range()));

          g.append("circle")
            .attr("class", "pollutant-standard")
            .attr("r", y(standard));

          g.append("text")
            .attr("class", name)
            .attr("y", -y(standard))
            .attr("dy", "0.35em")
            .text(standard);
        })
    );
}

const drawYAxis = (data, y) => {
  const yTicks = y.ticks(10);

  d3.select(".y-axis").selectAll("g")
    .data(yTicks)
    .join(
      enter => enter.append("g")
        .call(g => {
          g.append("circle")
            .attr("class", "ytick")
            .classed("ytick-inner", (d, i) => i === 0)
            .classed("ytick-outer", (d, i) => i === yTicks.length - 1)
            .classed("ytick-center", d     => d === 0)
            .attr("r", y)

          g.append("text")
            .attr("class", "temp")
            .attr("y", d => -y(d))
            .attr("dy", "0.35em")
            .text((d, i) => (i > 0 && i < yTicks.length - 1) ? d : "")
        })
    );
}

const drawLegend = (data) => {
  const [start, end] = d3.extent(data, d => d.Date);

  const dateFormat = {year: "numeric", day: "numeric", month: "short" };
  const [_start, _end] = [formatDate(start, dateFormat), formatDate(end, dateFormat)];

  const legend = d3.select(".legend");
  legend.selectAll("tspan").remove();

  let monthText = "";
  let yearText = "";

  if (_start === _end) {
    yearText = start.getFullYear();
    monthText = formatDate(start, { day: "numeric", month: "short" });

  } else {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = formatDate(start, { month: "short" });
    const endMonth = formatDate(end, { month: "short" });

    monthText = `${startMonth} - ${endMonth}`;
    yearText = startYear === endYear ? startYear : `${startYear}   ${endYear}`;
  }

  legend.append("tspan")
    .attr("class", "month")
    .text(monthText);

  legend.append("tspan")
    .attr("class", "year")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .text(yearText);
}

const drawTempGraph = (data, x, y) => {
  const graph = d3.areaRadial()
    .angle(d => x(d.DateRaw) + x.bandwidth() / 2)
    .innerRadius(y(0))
    .outerRadius(d => y(d.TEMP))
    .curve(d3.curveCatmullRom)

  d3.select(".temp-graph .graph").selectAll("path")
    .data([data])
    .join(
      enter => enter.append("path")
    )
    .attr("d", graph);
}

const bindEvents = (data, x, y) => {
  d3.selectAll(".x-axis .hitbox")
    .on("mouseenter", function(d) {
      d3.select(this.parentNode).raise();

      d3.selectAll(`.tooltip-${d.DateRaw}`)
        .classed("show", true)
    })
    .on("mouseleave", d => {
      d3.selectAll(`.tooltip-${d.DateRaw}`)
        .classed("show", false)
    })
}

const parseDate = d3.timeParse("%Y-%m-%d");
const parseTime = d3.timeParse("%H:%M:%S");

const formatDate = (date, format = null) => (
  date.toLocaleDateString(locale, format || { day: "numeric", month: "short" })
)

const rotateText = (d, x) => (
  (x(d.DateRaw) + x.bandwidth() / 2 - Math.PI * 0.5) * 180 / Math.PI
);
