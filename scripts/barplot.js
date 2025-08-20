export default class CircularBarplot { 

    width; height; margin;
    svg; chart; bars; labels; title;
    data;
    angleScale; radiusScale;
    maxLabels = 20; // default max number of bars/labels
    clickCallback = null;
    isInteractive = true;
    tooltipData = new Map();

    constructor(container, width, height, margin) { 
        this.width = width; 
        this.height = height;
        this.margin = margin;

        this.svg = d3.select(container).append("svg")
            .classed("viz", true)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("aspect-ratio", `${this.width} / ${this.height}`);

        
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);

        this.bars = this.chart.selectAll('line.bar');
        this.labels = this.chart.selectAll('text.label');

        this.title = this.svg.append('text')
            .classed('title', true)
            .attr('transform', `translate(${this.width / 2}, ${this.margin[0] - 35})`)
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold');

        this.tooltip = d3.select(".tooltip");

        this.angleScale = d3.scaleBand().padding(0.05);  
        this.radiusScale = d3.scaleLinear();
    }
    // updates circular bars
    #updateBars(duration) {
        const self = this;

        this.bars = this.chart.selectAll('line.bar')
            .data(this.data, d => d.label)
            .join('line')
            .classed('bar', true)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                if (self.isInteractive) {
                    d3.select(this).attr("stroke", "orangered");
                }

                const info = self.tooltipData.get(d.label);
                self.tooltip
                    .style("display", "block")
                    .html(`
                        <strong>${d.label}</strong><br>
                        Total Revenue: $${info?.revenue.toLocaleString() ?? "N/A"}<br>
                        Total Listings: ${info?.listings ? d3.format(",")(info.listings) : "N/A"}<br>
                        Avg Room Price: $${info?.avgRoomPrice ?? "N/A"}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function (event) {
                self.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                if (self.isInteractive) {
                    d3.select(this).attr("stroke", "steelblue");
                }
                self.tooltip.style("display", "none");
            })            
            .on("click", function (event, d) {
                if (!self.isInteractive || !self.clickCallback) return;
                self.clickCallback(d.label);
            });

        this.bars.transition()
            .duration(duration)
            .attr("x1", d => Math.cos(this.angleScale(d.label)) * this.radiusScale(20))
            .attr("y1", d => Math.sin(this.angleScale(d.label)) * this.radiusScale(20))
            .attr("x2", d => Math.cos(this.angleScale(d.label)) * this.radiusScale(d.value))
            .attr("y2", d => Math.sin(this.angleScale(d.label)) * this.radiusScale(d.value))
            .attr("stroke", "steelblue")
            .attr("stroke-width", 16);
    }
    // Updates labels and their position
    #updateLabels(duration) {
        const maxLabelLength = 10;
        const self = this;

        this.labels = this.chart.selectAll('text.label')
            .data(this.data, d => d.label)
            .join('text')
            .classed('label', true)
            .attr("fill", "black")
            .style("font-size", "11px")
            .on("mouseover", function (event, d) {
                const info = self.tooltipData.get(d.label);
                self.tooltip
                    .style("display", "block")
                    .html(`
                        <strong>${d.label}</strong><br>
                        Total Revenue: $${info?.revenue.toLocaleString() ?? "N/A"}<br>
                        Total Listings: ${info?.listings ? d3.format(",")(info.listings) : "N/A"}<br>
                        Avg Room Price: $${info?.avgRoomPrice ?? "N/A"}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function (event) {
                self.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                self.tooltip.style("display", "none");
            });

        this.labels.transition()
            .duration(duration)
            .attr('transform', d => {
                const angle = (this.angleScale(d.label) * 180) / Math.PI;
                const radius = this.radiusScale(d.value) + 10;
                const x = Math.cos(this.angleScale(d.label)) * radius;
                const y = Math.sin(this.angleScale(d.label)) * radius;
                const rotate = angle > 90 && angle < 270 ? angle + 180 : angle;
                return `translate(${x},${y}) rotate(${rotate})`;
            })
            .text(d => d.label.length > maxLabelLength ? d.label.slice(0, maxLabelLength) + "…" : d.label)
            .attr('text-anchor', d => {
                let angle = (this.angleScale(d.label) * 180) / Math.PI;
                return angle > 90 && angle < 270 ? 'end' : 'start';
            });
    }

    //Render function draws circular barplot
    render(dataset, { duration = 700 } = {}) {
        this.currentData = dataset;
        const limitedData = dataset
            .sort((a, b) => d3.descending(a[1], b[1]))
            .slice(0, this.maxLabels)
            .map(d => ({ label: d[0], value: d[1] }));

        this.data = limitedData;

        this.angleScale.domain(this.data.map(d => d.label)).range([0, 2 * Math.PI]);
        this.radiusScale.domain([0, d3.max(this.data, d => d.value)])
            .range([50, Math.min(this.width, this.height) / 2 - 20]);

        this.tooltip.style("display", "none");
        this.#updateBars(duration);
        this.#updateLabels(duration);

        return this;
    }

    // Sets the chart title
    setTitle(title=''){
        this.title.text(title);
        return this;
    }

    // Set the data used
    setData(data) {
        this.allData = data;
        return this;
    }

    // Sets the max number of labels and also bars to be sbhown
    setMaxLabels(count) {
        this.maxLabels = count;
        return this;
    }

    // Enables/disables interactivity
    setInteractive(enabled = true) {
        this.isInteractive = enabled;
        return this;
    }

    // Assign a callback for when a  bar is clicked
    onBarClick(callback) {
        this.clickCallback = callback;
        return this;
    }

    // Filter, group and update chart based on selections
    update(location = null, level = "country", roomType = null) {
        let filtered = this.allData.filter(d => {
            return (level === "city" ? d.city === location : location ? d.country === location : true)
                && (!roomType || d.roomType === roomType);
        });
    
        // choose grouping key
        const groupKey = level === "city"
            ? d => d.neighbourhood
            : level === "country" && location
                ? d => d.city
                : d => d.country;
    
        const groupedData = d3.rollup(
            filtered,
            v => d3.sum(v, d => d.prospectiveRevenue),
            groupKey
        );
    
        this.tooltipData.clear();
        const barplotData = Array.from(groupedData, ([label, revenue]) => {
            const matching = filtered.filter(d => groupKey(d) === label);
            const listings = matching.length;
            const avgRoomPrice = d3.mean(matching, d => d.roomPrice) ?? 0;
    
            this.tooltipData.set(label, {
                revenue,
                listings,
                avgRoomPrice: +avgRoomPrice.toFixed(2)
            });
    
            return [label, revenue];
        });
    
        const title = level === "city"
            ? `Revenue by Neighborhood in ${location}`
            : location
                ? `Revenue by City in ${location}`
                : "Revenue by Country";
        
        // Set slider limtis and label
        const max = barplotData.length;
        const slider = d3.select("#barCountSlider");
        const defaultValue = Math.min(20, max);
    
        slider
            .attr("min", 1)
            .attr("max", max)
            .property("value", defaultValue);
    
        d3.select("#barCountValue").text(defaultValue);
        d3.select("#sliderLabel").text(`Number of Bars: ${defaultValue} of ${max}`);
    
        this.currentData = barplotData;
        this.setMaxLabels(defaultValue).render(barplotData).setTitle(title);
    }
    
}