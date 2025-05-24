// js/main.js
const box = document.querySelector(".box1");
const boxWidth = box.clientWidth;
const boxHeight = box.clientHeight;

const box3 = document.querySelector(".box3");
const box3Width = box3.clientWidth;
const box3Height = box3.clientHeight;

const svgLine = d3.select(".box1")
    .append("svg")
    .attr("width", boxWidth)
    .attr("height", boxHeight);

// Set up SVG inside .box2
const svgHist = d3.select(".box2")
    .append("svg")
    .attr("width", boxWidth)
    .attr("height", boxHeight);

const svgParallel = d3.select(".box3")
    .append("svg")
    .attr("width", box3Width)
    .attr("height", box3Height);

let margin = { top: 10, right: 30, bottom: 50, left: 60 };
let histWidth = 600 - margin.left - margin.right;
let histHeight = 400 - margin.top - margin.bottom;

//sets up a color scale for experience levels in the histogram
const color1 = d3.scaleOrdinal()
    .domain(["EN", "MI", "SE", "EX"])
    .range(["#ff6361", "#ffa600", "#58508d", "#bc5090"]);

const defaultColor = "#bc5090";

//helper to get color or fallback if not found
const getColor = level => color1.domain().includes(level) ? color1(level) : defaultColor;

d3.csv("./data/ds_salaries.csv").then(rawData => {
    rawData.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.work_year = +d.work_year;
        d.remote_ratio = +d.remote_ratio;
    });

    const filteredData = rawData.filter(d => !isNaN(d.salary_in_usd) && d.experience_level);

    drawHistogram(filteredData);
    drawLineChart(filteredData);
    drawParallelCoordinates(filteredData);
});
