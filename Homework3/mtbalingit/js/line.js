function drawLineChart(data) {
    svgLine.selectAll("*").remove(); //clear previous contents

    const margin = { top: 20, right: 100, bottom: 45, left: 60 };
    const width = boxWidth - margin.left - margin.right;
    const height = boxHeight - margin.top - margin.bottom;

    const g = svgLine.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    //gets sorted unique years for timesteps
    const years = Array.from(new Set(data.map(d => d.work_year))).sort((a, b) => a - b);

    //nest data by company size, with work_year and avg salary for all years
    const nested = Array.from(
        d3.group(data, d => d.company_size),
        ([key, values]) => ({
            key: key,
            values: Array.from(
                d3.rollup(values, v => d3.mean(v, d => d.salary_in_usd), d => d.work_year),
                ([year, avg]) => ({ work_year: +year, avg_salary: +avg })
            ).sort((a, b) => a.work_year - b.work_year)
        })
    );

    //scales
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.work_year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(nested, c => d3.max(c.values, d => d.avg_salary))])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(["S", "M", "L"])
        .range(["blue", "red", "green"]);

    //axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g")
        .call(d3.axisLeft(y));

    //labels for axes
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Work Year");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Average Salary (USD)");

    //legend
    const legendData = ["S", "M", "L"];

    const legend = svgLine.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left + width + 20}, ${margin.top})`);

    const legendItemHeight = 20;
    const legendRectSize = 15;

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * legendItemHeight)
        .attr("width", legendRectSize)
        .attr("height", legendRectSize)
        .attr("fill", d => color(d));

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", legendRectSize + 5)
        .attr("y", (d, i) => i * legendItemHeight + legendRectSize / 1.5)
        .text(d => {
            if (d === "S") return "Small";
            if (d === "M") return "Medium";
            if (d === "L") return "Large";
            return d;
        })
        .style("font-size", "12px")
        .style("alignment-baseline", "middle");


    //creates chart title
    svgLine.append("text")
        .attr("x", margin.left + width / 2)
        .attr("y", margin.top / 1.5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Average Salary by Work Year and Company Size");

    //creates lines
    const line = d3.line()
        .x(d => x(d.work_year))
        .y(d => y(d.avg_salary));

    //tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const linesGroup = g.append("g");
    const dotsGroup = g.append("g");

    //animation state
    let currentYearIndex = 0;
    let interval = null;
    let isPlaying = false;

    function update(year) {
        //for each company size, filter values up to the current year
        const filteredData = nested.map(group => ({
            key: group.key,
            values: group.values.filter(d => d.work_year <= year)
        }));

        //render the lines up to the updated year
        const lines = linesGroup.selectAll("path")
            .data(filteredData, d => d.key);

        lines.enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke-width", 2)
            .merge(lines)
            .transition()
            .duration(800)
            .attr("stroke", d => color(d.key))
            .attr("d", d => line(d.values));

        lines.exit().remove();

        //update dots
        const dotsData = filteredData.flatMap(g => g.values.map(v => ({
            company_size: g.key,
            work_year: v.work_year,
            avg_salary: v.avg_salary
        })));

        const dots = dotsGroup.selectAll("circle")
            .data(dotsData, d => d.company_size + "-" + d.work_year);

        dots.enter()
            .append("circle")
            .attr("class", d => `dot dot-${d.company_size}`)
            .attr("cx", d => x(d.work_year))
            .attr("cy", y(0))
            .attr("r", 4)
            .attr("fill", d => color(d.company_size))
            .attr("stroke", "none")
            .attr("stroke-width", 2)
            .on("mouseover", function(event) {
                d3.select(this).attr("stroke", "white");
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke", "none");
            })
            .on("click", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`$${d.avg_salary.toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                event.stopPropagation();
            })
            .merge(dots)
            .transition()
            .duration(800)
            .attr("cx", d => x(d.work_year))
            .attr("cy", d => y(d.avg_salary));

        dots.exit()
            .transition()
            .duration(800)
            .attr("cy", y(0))
            .remove();
    }

    //draws the initial state
    update(years[currentYearIndex]);

    //play animation function
    function play() {
        if (isPlaying) return;
        isPlaying = true;
        interval = setInterval(() => {
            currentYearIndex++;
            if (currentYearIndex >= years.length) {
                currentYearIndex = 0;
            }
            update(years[currentYearIndex]);
        }, 2000);
        playButton.property("disabled", true);
        pauseButton.property("disabled", false);
    }

    //pausing animation function
    function pause() {
        if (!isPlaying) return;
        isPlaying = false;
        clearInterval(interval);
        playButton.property("disabled", false);
        pauseButton.property("disabled", true);
    }

    //control buttons 
    const controlsDiv = d3.select(svgLine.node().parentNode)
        .selectAll(".controls")
        .data([null]);

    const controls = controlsDiv.enter()
        .append("div")
        .attr("class", "controls")
        .style("margin-top", "10px")
        .merge(controlsDiv);

    controls.selectAll("*").remove();

    const playButton = controls.append("button")
        .text("Play")
        .style("margin-right", "10px")
        .on("click", play);

    const pauseButton = controls.append("button")
        .text("Pause")
        .attr("disabled", true)
        .on("click", pause);

    //hides tooltip if click outside dots
    d3.select("body").on("click", function(event) {
        if (!event.target.closest("circle.dot")) {
            tooltip.transition().duration(200).style("opacity", 0);
        }
    });


}
