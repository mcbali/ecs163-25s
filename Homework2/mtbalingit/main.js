let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let margin = { top: 10, right: 30, bottom: 50, left: 60 };
let histWidth = 600 - margin.left - margin.right;
let histHeight = 400 - margin.top - margin.bottom;

///define dimensions for the second plot (line chart)
const lineWidth = 600;
const lineHeight = 400;
const lineMargin = { top: 10, right: 30, bottom: 50, left: 60 };

//sets up a color scale for experience levels in the histogram
const color1 = d3.scaleOrdinal()
  .domain(["EN", "MI", "SE", "EX"])
  .range(["#ff6361", "#ffa600", "#58508d", "#bc5090"]);

const defaultColor = "#bc5090";

//helper to get color or fallback if not found
const getColor = level => color1.domain().includes(level) ? color1(level) : defaultColor;

d3.csv("./data/ds_salaries.csv").then(rawData => {
    rawData.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd; //makes sure salary is a number
    });
    //plot 1: stacked histogram
    const filteredData = rawData.filter(d => !isNaN(d.salary_in_usd) && d.experience_level);
    
    //set up x scale for histogram based on salary
    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.salary_in_usd)])
        .range([0, histWidth]);

    //bins the salaries for the histogram
    const histogram = d3.histogram()
        .value(d => d.salary_in_usd)
        .domain(x.domain())
        .thresholds(x.ticks(20));

    const bins = histogram(filteredData);

    //group each bin by experience level and count occurrences
    const stackedBins = bins.map(bin => {
        const counts = {};
        bin.forEach(d => {
            const level = d.experience_level;
            counts[level] = (counts[level] || 0) + 1;
        });

        const result = { x0: bin.x0, x1: bin.x1 };
        Object.keys(counts).forEach(level => {
            result[level] = counts[level];
        });
        return result;
    });

    //get unique experience levels
    const allLevels = Array.from(new Set(filteredData.map(d => d.experience_level)));

    //stack data for the histogram
    const stack = d3.stack().keys(allLevels);
    const stackedData = stack(stackedBins);
    //y scale for stacked bar height
    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedBins, d => {
            return d3.sum(allLevels, level => d[level] || 0);
        })])
        .range([histHeight, 0]);

    //main svg container for everything
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height); //feel free to tweak height if needed

    //group for the histogram chart
    const g1 = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //draw x-axis for histogram
    g1.append("g")
        .attr("transform", `translate(0, ${histHeight})`)
        .call(d3.axisBottom(x));
    //x-axis label
    g1.append("text")
        .attr("x", histWidth / 2)
        .attr("y", histHeight + 40)
        .attr("text-anchor", "middle")
        .text("Salary in USD");

    //draw y-axis for histogram
    g1.append("g").call(d3.axisLeft(y));
    //y-axis label
    g1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -histHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Count");

    //draw the stacked bars
    g1.selectAll("g.layer")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "layer")
        .attr("fill", d => getColor(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.x0) + 1)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", d => x(d.data.x1) - x(d.data.x0) - 1);

    //legend for experience levels
    const legendX = histWidth + margin.left + 20;

    const legend1 = svg.append("g")
        .attr("transform", `translate(${legendX}, ${margin.top})`);

    ["EN", "MI", "SE", "EX"].forEach((s, i) => {
        legend1.append("rect")
            .attr("x", 0)
            .attr("y", i * 25)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", getColor(s));
        legend1.append("text")
            .attr("x", 20)
            .attr("y", i * 25 + 12)
            .attr("alignment-baseline", "middle")
            .text(s);
    });

    //plot 2: line chart

    const lineX = 700 + lineMargin.left;
    const lineY = margin.top + lineMargin.top;

    //group avg salary by year and company size
    const nestedSizeData = d3.nest()
        .key(d => d.work_year)
        .key(d => d.company_size)
        .rollup(v => d3.mean(v, d => d.salary_in_usd))
        .entries(filteredData);

    //flattens data
    const companySizeData = {};
    nestedSizeData.forEach(yearEntry => {
        const year = +yearEntry.key;
        yearEntry.values.forEach(sizeEntry => {
            const size = sizeEntry.key;
            const avgSalary = sizeEntry.value;
            if (!companySizeData[size]) companySizeData[size] = [];
            companySizeData[size].push({ year, avgSalary });
        });
    });

    //color scale for company sizes
    const sizeColor = d3.scaleOrdinal()
        .domain(["S", "M", "L"])
        .range(["red", "blue", "green"]);

    const x2 = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => +d.work_year))
        .range([0, lineWidth - lineMargin.left - lineMargin.right]);

    const y2 = d3.scaleLinear()
        .domain([0, d3.max(Object.values(companySizeData).flat(), d => d.avgSalary)])
        .range([lineHeight - lineMargin.top - lineMargin.bottom, 0]);

    //group for the line chart
    const g2 = svg.append("g")
        .attr("transform", `translate(${lineX}, ${lineY})`);

    //x-axis for line chart
    g2.append("g")
        .attr("transform", `translate(0, ${lineHeight - lineMargin.top - lineMargin.bottom})`)
        .call(d3.axisBottom(x2).ticks(5).tickFormat(d3.format("d")));

    //y-axis for line chart
    g2.append("g")
        .call(d3.axisLeft(y2));

    //x-axis label
    g2.append("text")
        .attr("x", (lineWidth - lineMargin.left - lineMargin.right) / 2)
        .attr("y", lineHeight - lineMargin.bottom + 40)
        .attr("text-anchor", "middle")
        .text("Work Year");

    //y-axis label
    g2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(lineHeight - lineMargin.top - lineMargin.bottom) / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Avg Salary (USD)");

    //line generator
    const lineGen = d3.line()
        .x(d => x2(d.year))
        .y(d => y2(d.avgSalary));

    //draw lines and points
    Object.entries(companySizeData).forEach(([size, data]) => {
        g2.append("path")
            .datum(data.sort((a, b) => a.year - b.year))
            .attr("fill", "none")
            .attr("stroke", sizeColor(size))
            .attr("stroke-width", 2)
            .attr("d", lineGen);

        g2.selectAll(`.dot-${size}`)
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x2(d.year))
            .attr("cy", d => y2(d.avgSalary))
            .attr("r", 3)
            .attr("fill", sizeColor(size));
    });

    //legend for company size
    const legend3 = g2.append("g")
        .attr("transform", `translate(${lineWidth - lineMargin.left - lineMargin.right - 100}, 0)`);

    ["S", "M", "L"].forEach((size, i) => {
        legend3.append("rect")
            .attr("x", 120)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", sizeColor(size));
        legend3.append("text")
            .attr("x", 140)
            .attr("y", i * 20 + 10)
            .attr("alignment-baseline", "middle")
            .text(size);
    });

    //plot 3: parallel coordinates

    const parallelMargin = { top: 40, right: 30, bottom: 10, left: 60 };
    const parallelWidth = 1200;
    const parallelHeight = 400;

    const dimensions = ["salary_in_usd", "company_location", "employee_residence", "remote_ratio"];

    //y scales for each dimension
    const y3 = {};
    dimensions.forEach(dim => {
        if (dim === "salary_in_usd" || dim === "remote_ratio") {
            y3[dim] = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => +d[dim]))
                .range([parallelHeight - parallelMargin.top - parallelMargin.bottom, 0]);
        } else {
            const uniqueVals = [...new Set(filteredData.map(d => d[dim]))];
            y3[dim] = d3.scalePoint()
                .domain(uniqueVals)
                .range([parallelHeight - parallelMargin.top - parallelMargin.bottom, 0]);
        }
    });

    //x scale for dimensions
    const x3 = d3.scalePoint()
        .range([0, parallelWidth - parallelMargin.left - parallelMargin.right])
        .padding(1)
        .domain(dimensions);

    //color scale for remote ratio
    const color3 = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(filteredData, d => +d.remote_ratio));

    //group for parallel plot
    const g3 = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${histHeight + 120})`);

    //function to draw a path per row
    function path(d) {
        return d3.line()(dimensions.map(p => [x3(p), y3[p](d[p])]));
    }

    //draw the lines
    g3.selectAll("myPath")
        .data(filteredData)
        .enter().append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => color3(d.remote_ratio))
        .style("opacity", 0.3);

    //draw axes for each dimension
    dimensions.forEach(dim => {
        g3.append("g")
            .attr("transform", `translate(${x3(dim)}, 0)`)
            .each(function() {
                d3.select(this).call(d3.axisLeft().scale(y3[dim]));
            })
            .append("text")
            .style("text-anchor", "middle")
            .attr("y", -10)
            .text(dim)
            .style("fill", "black");
    });

    //creates legend with gradient, gradient seems unnecessary for this database in hindsight
    const defs = svg.append("defs");

    const legendGradientId = "legendGradient";
    const gradient = defs.append("linearGradient")
        .attr("id", legendGradientId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    const legendDomain = color3.domain();
    const legendStops = 10;
    for (let i = 0; i <= legendStops; i++) {
        const t = i / legendStops;
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", color3(legendDomain[0] + t * (legendDomain[1] - legendDomain[0])));
    }

    const legendWidth = 300;
    const legendHeight = 15;
    const legendY = histHeight + parallelHeight + 140;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    //draw color gradient box
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${legendGradientId})`)
        .attr("x", -100)
        .attr("y", -50)
        .style("stroke", "black");

    //draw axis under the gradient
    const legendScale = d3.scaleLinear()
        .domain(legendDomain)
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format("d"));

    legendGroup.append("g")
        .attr("transform", `translate(-100, ${-35})`)
        .call(legendAxis);

    //label for gradient
    legendGroup.append("text")
        .attr("x", legendWidth / 6)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("remote_ratio");

});
