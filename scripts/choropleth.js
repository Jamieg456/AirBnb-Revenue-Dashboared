export default class ChoroplethMap {
    width; height;
    svg; mapGroup;
    projection; pathGen;
    regions;
    colorScale;
    selectedCountry = null; // tracks current sleceted country
    updateCallback = null; // Store callback function

    constructor(container, width, height) {
        this.width = width;
        this.height = height;

        // setting up SVG container
        this.svg = d3.select(container).append("svg")
            .classed("viz", true)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("aspect-ratio", `${this.width} / ${this.height}`);


        // base map container
        this.mapGroup = this.svg.append('g').classed('map', true);

        // Initialise color scale to encode revenue
        this.colorScale = d3.scaleSequential(d3.interpolateBlues);

        // Tooltip Setup
        this.tooltip = d3.select(".tooltip");
    }

    // Config base map using regions and projection
    baseMap(regions = [], projection = d3.geoMercator) {
        this.regions = regions;
        this.projection = d3.geoMercator()
            .fitSize([this.width - 20, this.height - 20], this.regions);
        this.pathGen = d3.geoPath().projection(this.projection);
        this.mapGroup.attr("transform", "translate(0, 10)");

        return this;
    }

    // Process and render revenue data on the map
    renderRevenueData(revenueData, updateCallback) {
        this.updateCallback = updateCallback;

        const { revenueByCountry, listingsByCountry, roomPriceTotals } = this.#computeCountryStats(revenueData);
        this.#renderMap(revenueByCountry, listingsByCountry, roomPriceTotals);
        this.#renderLegend(revenueByCountry);

        return this;
    }

    // Agregate data by country - revenue, listings, and average prices
    #computeCountryStats(data) {
        const revenueByCountry = {};
        const listingsByCountry = {};
        const roomPriceTotals = {};

        data.forEach(({ country, prospectiveRevenue, roomPrice }) => {
            const name = country.trim().toLowerCase();
            revenueByCountry[name] = (revenueByCountry[name] || 0) + prospectiveRevenue;
            listingsByCountry[name] = (listingsByCountry[name] || 0) + 1;
            roomPriceTotals[name] = (roomPriceTotals[name] || 0) + roomPrice;
        });

        this.colorScale.domain([
            d3.min(Object.values(revenueByCountry)),
            d3.max(Object.values(revenueByCountry))
        ]);

        return { revenueByCountry, listingsByCountry, roomPriceTotals };
    }

    // Render the country shapes and attach tooltip as wellas click handlers
    #renderMap(revenueByCountry, listingsByCountry, roomPriceTotals) {
        this.mapGroup.selectAll('path.regions')
            .data(this.regions.features)
            .join('path')
            .classed('regions', true)
            .attr('d', this.pathGen)
            .attr('fill', d => {
                let name = d.properties.NAME.trim().toLowerCase();
                return revenueByCountry[name] ? this.colorScale(revenueByCountry[name]) : "#ccc";
            })
            .attr('stroke', "#333")
            .attr('stroke-width', 1)
            .style("cursor", d => {
                let name = d.properties.NAME.trim().toLowerCase();
                return revenueByCountry[name] ? "pointer" : "not-allowed";
            })
            .style("opacity", d => {
                let name = d.properties.NAME.trim().toLowerCase();
                return revenueByCountry[name] ? 1 : 0.5; // reduces opacity for non-data countries
            })
            .on("mouseover", (event, d) => {
                let name = d.properties.NAME.trim().toLowerCase();
                let revenue = revenueByCountry[name];
                let listings = listingsByCountry[name];
                let avgRoomPrice = roomPriceTotals[name] / listings;
                let avgRevenue = revenue / listings;

                this.tooltip.style("display", "block")
                    .style("left", `${event.pageX + 10}px`) // posiitons to the right of mouse
                    .style("top", `${event.pageY - 10}px`) // positions slightly above 

                // Shows "No data" if country has no revenue data
                if (!revenue) {
                    this.tooltip.html(`
                        <strong>${d.properties.NAME}</strong><br>
                        <span style="color:red;">No data available</span>
                    `);
                    return;
                }

                // Tooltip for countries with data
                this.tooltip.html(`
                    <strong>${d.properties.NAME}</strong><br>
                    Total Revenue: $${revenue.toLocaleString()}<br>
                    Total Listings: ${listings.toLocaleString()}<br>
                    Avg Room Price: $${avgRoomPrice.toFixed(2)}<br>
                    Avg Revenue: $${avgRevenue.toLocaleString()}<br>
                `);
            })
            .on("mousemove", event => {
                this.tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseout", () => this.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                let name = d.properties.NAME.trim().toLowerCase();
                if (!revenueByCountry[name]) return;

                if (this.selectedCountry) {
                    d3.select(this.selectedCountry).attr('stroke', "#333").attr('stroke-width', 1);
                }

                if (this.selectedCountry === event.currentTarget) {
                    this.selectedCountry = null;
                    if (this.updateCallback) this.updateCallback(null);
                    return;
                }

                d3.select(event.currentTarget).attr('stroke', "red").attr('stroke-width', 1.5);
                this.selectedCountry = event.currentTarget;
                if (this.updateCallback) this.updateCallback(name);
            });
    }

    // Renders the color scale legend
    #renderLegend(revenueByCountry) {
        this.svg.selectAll(".legend").remove();
        this.svg.selectAll("defs").remove();

        const legendWidth = 140;
        const legendHeight = 12;

        const defs = this.svg.append("defs");
        const gradientId = "color-gradient";

        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", this.colorScale.range()[0]);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", this.colorScale.range()[1]);

        const legendGroup = this.svg.append("g")
            .classed("legend", true)
            .attr("transform", `translate(20, ${this.height - 10})`);

        legendGroup.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", `url(#${gradientId})`)
            .attr("stroke", "#333");

        // Adds labels for min and max values
        const formatAbbr = d => d3.format(".2s")(d).replace("G", "B");
        const min = d3.min(Object.values(revenueByCountry));
        const max = d3.max(Object.values(revenueByCountry));

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", -2)
            .text(formatAbbr(min))
            .attr("font-size", "10px")
            .attr("fill", "#000");

        legendGroup.append("text")
            .attr("x", legendWidth)
            .attr("y", -2)
            .attr("text-anchor", "end")
            .text(formatAbbr(max))
            .attr("font-size", "10px")
            .attr("fill", "#000");
    }

    // Highlights a country on the map
    highlightCountry(country) {
        this.mapGroup.selectAll('path.regions')
            .attr('stroke', d => {
                const name = d.properties.NAME.trim().toLowerCase();
                return country && name === country.toLowerCase() ? "red" : "#333";
            })
            .attr('stroke-width', d => {
                const name = d.properties.NAME.trim().toLowerCase();
                return country && name === country.toLowerCase() ? 1.5 : 1;
            });

        // synchranises internal state with visual selection
        this.selectedCountry = null;
        if (country) {
            this.mapGroup.selectAll('path.regions').each((d, i, nodes) => {
                const name = d.properties.NAME.trim().toLowerCase();
                if (name === country.toLowerCase()) {
                    this.selectedCountry = nodes[i];
                }
            });
        }
    }
}