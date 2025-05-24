function drawHistogram(filteredData) {
    const margin = { top: 20, right: 100, bottom: 85, left: 60 };
    const width = boxWidth - margin.left - margin.right;
    const height = boxHeight - margin.top - margin.bottom - 10;

    //sets up x scale for histogram based on salary
    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.salary_in_usd)])
        .range([0, width]);

    //bins the salaries for the histogram
    const histogram = d3.histogram()
        .value(d => d.salary_in_usd)
        .domain(x.domain())
        .thresholds(x.ticks(20));

    const bins = histogram(filteredData);

    //groups each bin by experience level and count occurrences
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

    const allLevels = Array.from(new Set(filteredData.map(d => d.experience_level)));

    const stack = d3.stack().keys(allLevels);
    const stackedData = stack(stackedBins);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedBins, d => {
            return d3.sum(allLevels, level => d[level] || 0);
        })])
        .range([height, 0]);

    const g1 = svgHist.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //x-axis
    g1.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    g1.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Salary in USD");

    //y-axis
    g1.append("g").call(d3.axisLeft(y));

    g1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Count");

    //draws the stacked bars
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
        .attr("width", d => x(d.data.x1) - x(d.data.x0) - 1)
        .on("click", function (event, d) {
            //removes any existing labels
            g1.selectAll(".bar-label").remove();

            const count = d[1] - d[0];
            const barX = x(d.data.x0) + ((x(d.data.x1) - x(d.data.x0)) / 2);

            g1.append("text")
                .attr("class", "bar-label")
                .attr("x", barX)
                .attr("y", y((d[0] + d[1]) / 2 - 6))
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("fill", "black")
                .text(count);
        })
        .on("mouseover", function (event) {
            const currentColor = d3.select(this).attr("fill");
            const lighterColor = d3.color(currentColor).brighter(0.5);
            d3.select(this).attr("fill", lighterColor);
        })
        .on("mouseout", function (event, d) {
            //restore original color
            const experienceLevel = d3.select(this.parentNode).datum().key;
            d3.select(this).attr("fill", getColor(experienceLevel));
        });


    //legend
    const legend = g1.selectAll(".legend")
        .data(["EN", "MI", "SE", "EX"])
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width + 10},${i * 25})`);

    legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", getColor);

    legend.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d => d);

    //creates title
    svgHist.append("text")
        .attr("x", margin.left + width / 2)
        .attr("y", margin.top / 1.5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Histogram of Salaries by Experience Level");
}
