function drawParallelCoordinates(filteredData) {
    const parallelMargin = { top: 50, right: 0, bottom: 50, left: 0 };

    const width = box3Width - parallelMargin.left - parallelMargin.right;
    const height = box3Height - parallelMargin.top - parallelMargin.bottom;

    const dimensions = ["salary_in_usd", "company_location", "employee_residence", "company_size"];

    const y = {};
    dimensions.forEach(dim => {
        if (dim === "salary_in_usd") {
            y[dim] = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => +d[dim]))
                .range([height, 0]);
        } else if (dim === "company_size") {
            //categorical scale for company_size
            const uniqueVals = [...new Set(filteredData.map(d => d[dim]))];
            y[dim] = d3.scalePoint()
                .domain(uniqueVals)
                .range([height, 0])
                .padding(0.5);
        } else {
            const uniqueVals = [...new Set(filteredData.map(d => d[dim]))];
            y[dim] = d3.scalePoint()
                .domain(uniqueVals)
                .range([height, 0])
                .padding(0.5);
        }
    });

    const x = d3.scalePoint()
        .range([0, width])
        .padding(1)
        .domain(dimensions);

    //color scale for remote_ratio, doesn't need to be a gradient scale in hindsight
    const color = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(filteredData, d => +d.remote_ratio));

    const g = svgParallel.append("g")
        .attr("transform", `translate(${parallelMargin.left}, ${parallelMargin.top})`);

    //creates chart title
    svgParallel.append("text")
        .attr("x", box3Width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Parallel Coordinates Plot of Salary, Location, Company Size");

    //path generator
    function path(d) {
        return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
    }

    //draws lines group for brushing selection
    const lines = g.selectAll("myPath")
        .data(filteredData)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => color(d.remote_ratio))
        .style("opacity", 0.3);

    //axes and brushing
    const brush = d3.brushY()
        .extent([[-10, 0], [10, height]])
        .on("brush end", brushed);

    const axisGroups = g.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)},0)`);

    axisGroups.each(function (dim) {
        const axis = d3.axisLeft(y[dim]);
        d3.select(this).call(axis);

        d3.select(this).append("text")
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .text(dim)
            .style("fill", "black");

        d3.select(this)
            .append("g")
            .attr("class", "brush")
            .call(brush);
    });

    //brushing implementatin
    function brushed(event) {
        const actives = [];

        axisGroups.each(function (dim) {
            const brushSelection = d3.brushSelection(this.querySelector(".brush"));
            if (brushSelection) {
                actives.push({
                    dimension: dim,
                    extent: brushSelection //[y0, y1] in pixels
                });
            }
        });

        lines.style("display", d => {
            return actives.every(active => {
                const dim = active.dimension;
                const extent = active.extent;

                if (y[dim].invert) {
                    const domainExtent = extent.map(y[dim].invert).sort((a, b) => a - b);
                    return d[dim] >= domainExtent[0] && d[dim] <= domainExtent[1];
                } else {
                    const pos = y[dim](d[dim]);
                    return pos >= extent[0] && pos <= extent[1];
                }
            }) ? null : "none";
        });
    }


    //Color legend for remote_ratio remains unchanged
    const defs = svgParallel.append("defs");

    const legendId = "legendGradient";
    const gradient = defs.append("linearGradient")
        .attr("id", legendId)
        .attr("x1", "0%")
        .attr("x2", "100%");

    const legendDomain = color.domain();
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", color(legendDomain[0] + t * (legendDomain[1] - legendDomain[0])));
    }

    const legendWidth = 200;
    const legendHeight = 10;

    //creates legend
    const legendGroup = svgParallel.append("g")
        .attr("transform", `translate(${box3Width / 2 - (legendWidth / 2)}, ${box3Height - 30})`);

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${legendId})`)
        .style("stroke", "black");

    const legendScale = d3.scaleLinear()
        .domain(legendDomain)
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".2f"));

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    legendGroup.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -6)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Remote Ratio");
}
