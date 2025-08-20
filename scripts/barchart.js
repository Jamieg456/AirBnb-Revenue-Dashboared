export default class BarChart{

    //Instances of the barchart
    svg; chart; bars; //responsible for setting up elements
    width; height; margin; //attributes to the elements
    axisX; axisY; scaleX; scaleY; labelX; labelY; //configures the axis
    data; title; //data used for designing the barchart
    clickCallback = null;
    selectedBarLabel = null;
    tooltipData = new Map();

    constructor(container, width, height, margin){
        this.width = width;
        this.height = height;
        this.margin = margin;

        //set up the container for the chart
        this.svg = d3.select(container).append("svg")
            .classed("viz", true)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("aspect-ratio", `${this.width} / ${this.height}`);

        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]}, ${this.margin[0]})`);

        this.bars = this.chart.selectAll('rect.bar');

        this.axisX =this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]}, ${this.height-this.margin[1]})`);

        this.axisY = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]}, ${this.margin[0]})`);

        this.labelX = this.svg.append('text')
            .attr('transform', `translate(${this.width/2},${this.height-5})`)
            .style('text-anchor', 'middle');
        this.labelY = this.svg.append('text')
            .attr('transform', `translate(0,${this.margin[0]})rotate(-90)`)
            .style('text-anchor', 'middle')
            .attr('dy', 15);

        this.title = this.svg.append('text')
            .classed('title', true)
            .attr('transform', `translate(${this.width/2},${this.margin[0]-30})`)
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold');

        this.tooltip = d3.select(".tooltip");
    }

    // Updates bar elements plus tooltip/interaction logic
    #updateBarChart() {
        let self = this;

        this.bars = this.chart.selectAll('rect.bar')
            .data(this.data, d=>d[0])
            .join(
                enter => enter.append('rect')
                    .classed('bar', true)
                    .attr('x', d => this.scaleX(d[0]))
                    .attr('width', this.scaleX.bandwidth())
                    .attr('y', this.scaleY(0))
                    .attr('height', 0)
                    .attr('fill', d => this.colorScale ? this.colorScale(d[1]) : 'steelblue')
                    .style("cursor", "pointer")
                    .on("mouseover", function (event, d) {
                        if (self.isInteractive) d3.select(this).attr("fill", "orangered");

                        const info = self.tooltipData.get(d[0]);

                        self.tooltip
                            .style("display", "block")
                            .html(`
                                <strong>${d[0]}</strong><br>
                                Total Revenue: $${d[1].toLocaleString()}<br>
                                Total Listings: ${info?.listings ? d3.format(",")(info.listings) : "N/A"}<br>
                                Avg Room Price: $${info?.avgRoomPrice ?? "N/A"}
                            `)
                            .style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY - 10}px`);
                    })
                    .on("mousemove", event => {
                        self.tooltip
                            .style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY - 10}px`);
                    })
                    .on("mouseout", function (event, d) {
                        const isSelected = self.selectedBarLabel === d[0];
                        d3.select(this)
                            .attr("fill", !self.isInteractive
                                ? self.colorScale ? self.colorScale(d[1]) : "steelblue"
                                : isSelected ? "orangered"
                                : self.colorScale ? self.colorScale(d[1]) : "steelblue");

                        self.tooltip.style("display", "none");
                    })                    
                    .on("click", function (event, d) {
                        if (!self.isInteractive) return;

                        self.chart.selectAll("rect.bar")
                            .attr("stroke", "none")
                            .attr("stroke-width", 0);

                        d3.select(this)
                            .attr("stroke", "red")
                            .attr("stroke-width", 2);

                        self.selectedBarLabel = d[0];
                        if (self.clickCallback) self.clickCallback(d[0]);
                    })
                    .call(enter => enter.transition()
                        .duration(800)
                        .attr('y', d => this.scaleY(d[1]))
                        .attr('height', d => this.scaleY(0) - this.scaleY(d[1]))
                    ),
                update => update
                    .transition()
                    .duration(800)
                    .attr('x', d => this.scaleX(d[0]))
                    .attr('width', this.scaleX.bandwidth())
                    .attr('y', d => this.scaleY(d[1]))
                    .attr('height', d => this.scaleY(0) - this.scaleY(d[1]))
                    .attr('fill', d => {
                        const isSelected = this.selectedBarLabel === d[0];
                        return isSelected ? "orangered" : this.colorScale ? this.colorScale(d[1]) : "steelblue";
                    })
                    .attr("stroke", d => this.selectedBarLabel === d[0] ? "red" : "none")
                    .attr("stroke-width", d => this.selectedBarLabel === d[0] ? 2 : 0),
                exit => exit
                    .transition()
                    .duration(500)
                    .attr('y', this.scaleY(0))
                    .attr('height', 0)
                    .remove()
            );
    }
    // Sets X adn Y scales based on data and dimensions
    #updateScales(){
        let chartWidth = this.width-this.margin[2]-this.margin[3];
        let chartHeight = this.height-this.margin[0]-this.margin[1];

        let rangeX = [0, chartWidth];
        let rangeY = [chartHeight, 0];

        let domainX = this.data.map(d=>d[0]);
        let domainY = [0, d3.max(this.data, d=>d[1])];

        this.scaleX = d3.scaleBand(domainX, rangeX).padding(0.2);
        this.scaleY = d3.scaleLinear(domainY, rangeY).nice();
    }

    // Updates axis visuals and adds tooltip for axis labels
    #updateAxis(){
        let axisGenX = d3.axisBottom(this.scaleX);
        let axisGenY = d3.axisLeft(this.scaleY)
            .tickFormat(d => d3.format(".2s")(d).replace("G", "B"));

        this.axisX.call(axisGenX);
        this.axisY.call(axisGenY);

        const maxLabelLength = 10;

        this.axisX.selectAll('text')
            .text(d => d.length > maxLabelLength ? d.slice(0, maxLabelLength) + "…" : d)
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45)")
            .attr("dx", "-0.6em")
            .attr("dy", "0.25em")
            .style("font-size", "11px")
            .on("mouseover", (event, d) => {
                this.tooltip
                    .style("display", "block")
                    .html(`<strong>${d}</strong>`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseout", () => {
                this.tooltip.style("display", "none");
            });
    }

    // Updates the chart with filtered and grouped data based on selection
    update(location = null, level = "country", roomType = null, mode = 'high') {
        let filtered = this.allData.filter(d =>
            (level === "city" ? d.city === location : location ? d.country === location : true)
            && (!roomType || d.roomType === roomType)
        );

        const groupKey = level === "city"
            ? d => d.neighbourhood
            : location ? d => d.city
            : d => d.country;

        const groupedData = d3.rollup(
            filtered,
            v => d3.sum(v, d => d.prospectiveRevenue),
            groupKey
        );

        // Tooltip info
        this.tooltipData.clear();
        for (const [label, revenue] of groupedData.entries()) {
            const matching = filtered.filter(d => groupKey(d) === label);
            const listings = matching.length;
            const avgRoomPrice = d3.mean(matching, d => d.roomPrice) ?? 0;
            this.tooltipData.set(label, {
                revenue,
                listings,
                avgRoomPrice: avgRoomPrice.toFixed(2)
            });
        }

        let sorted = Array.from(groupedData, ([label, revenue]) => [label, revenue])
            .filter(d => d[0])
            .sort((a, b) => d3.descending(a[1], b[1]));

        let topData, bottomData, title, xLabel;

        if (level === "city") {
            topData = sorted.slice(0, 10);
            bottomData = sorted.slice(-10).reverse();
            xLabel = "Neighbourhood";
            title = `Neighborhoods in ${location}`;
        } else if (location) {
            topData = sorted.slice(0, 5);
            bottomData = sorted.slice(-5).reverse();
            xLabel = "City";
            title = `Cities in ${location}`;
        } else {
            topData = sorted.slice(0, 10);
            bottomData = sorted.slice(-10).reverse();
            xLabel = "Country";
            title = "Countries";
        }

        const dataToRender = mode === 'high' ? topData : bottomData;
        const modeLabel = mode === 'high' ? 'Revenue: Top' : 'Revenue: Bottom';
        this.render(dataToRender)
            .setTitle(`${modeLabel} ${dataToRender.length} ${title}`)
            .setAxisLabels(xLabel, "Revenue");
    }    

    // Sets the chart title
    setTitle(title = '') {
        this.title.text(title);
        return this;
    }

    // Sets labels for X and Y axes
    setAxisLabels(labelX = '', labelY = '') {
        this.labelX.text(labelX);
        this.labelY.text(labelY);
        return this;
    }

    // Renders the full chart - scales, bars, axes
    render(dataset) {
        this.data = dataset;
        this.#updateScales();
        this.#updateBarChart();
        this.#updateAxis();
        return this;
    }

    // Enables/disables interactivity
    setInteractive(enabled = true) {
        this.isInteractive = enabled;
    }

    // Clears the current selection also removes highlight/stroke
    clearSelection() {
        this.selectedBarLabel = null;
        this.chart.selectAll("rect.bar")
            .attr("stroke", "none")
            .attr("stroke-width", 0)
            .attr("fill", d => this.colorScale ? this.colorScale(d[1]) : "steelblue");
    }

    // Registers click callback when bars clicked
    onBarClick(callback) {
        this.clickCallback = callback;
        return this;
    }

    // Sets the data
    setData(data) {
        this.allData = data;
        return this;
    }
}