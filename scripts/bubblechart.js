export default class BubbleChart {
    constructor(selector, width, height) {
        this.selector = selector;
        this.width = width;
        this.height = height;
        this.viewLevel = "country";
        this.highlighted = { country: null, city: null, neighborhood: null };

        this.svg = d3.select(selector).append("svg")
            .classed("viz", true)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("aspect-ratio", `${this.width} / ${this.height}`);


        this.svg.selectAll("*").remove();

        this.chartGroup = this.svg
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        this.backButton = this.svg
            .append("g")
            .attr("class", "back-button")
            .attr("cursor", "pointer")
            .attr("opacity", 0)
            .on("click", () => this.handleBackButton());

        this.backButton.append("rect")
            .attr("x", 10)
            .attr("y", 40)
            .attr("width", 60)
            .attr("height", 25)
            .attr("rx", 5)
            .attr("fill", "#4682B4");

        this.backButton.append("text")
            .attr("x", 40)
            .attr("y", 57)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text("Back");

        this.tooltip = d3.select("body")
            .selectAll(".bubbletooltip")
            .data([0])
            .join("div")
            .attr("class", "bubbletooltip")
            .style("opacity", 0);

        this.title = this.svg
            .append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("text-anchor", "middle");
    }

    // Renders the bubble chart with the given data
    render(data, allData) {
        console.log("Rendering data:", data);
        this.allData = allData;
        this.data = data;

        if (data && data.length > 0) {
            if (data.every(d => 'country' in d && 'reviews' in d && !('city' in d) && !('neighbourhood' in d))) {
                this.viewLevel = "country";
                this.highlighted = { country: null, city: null, neighborhood: null };
                this.backButton.attr("opacity", 0);
                this.originalData = JSON.parse(JSON.stringify(data));
            } else if (data.every(d => 'country' in d && 'city' in d && 'reviews' in d && !('neighbourhood' in d))) {
                this.viewLevel = "city";
                this.highlighted = { 
                    country: data[0].country || "Unknown", 
                    city: null, 
                    neighborhood: null 
                };
                this.backButton.attr("opacity", 1);
            } else if (data.every(d => 'country' in d && 'city' in d && 'neighbourhood' in d && 'reviews' in d)) {
                this.viewLevel = "neighborhood";
                this.highlighted = { 
                    country: data[0].country || "Unknown", 
                    city: data[0].city || "Unknown", 
                    neighborhood: null 
                };
                this.backButton.attr("opacity", 1);
            }
        } else {
            console.log("No data to render in viewLevel:", this.viewLevel);
        }

        this.chartGroup.selectAll("*").remove();

        if (!data || !data.length) {
            this.chartGroup.append("text")
                .attr("text-anchor", "middle")
                .text("No data available");
            this.title.text("");
            return this;
        }

        const maxReviews = d3.max(data, d => d.reviews) || 1;
        this.radiusScale = d3.scaleSqrt()
            .domain([0, maxReviews])
            .range([10, 60]);

        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        this.simulation = d3.forceSimulation(data)
            .force("charge", d3.forceManyBody().strength(30))
            .force("center", d3.forceCenter(0, 0))
            .force("collision", d3.forceCollide().radius(d => this.radiusScale(d.reviews) + 10))
            .on("tick", () => {
                this.bubbleGroups
                    .attr("transform", d => `translate(${d.x || 0}, ${d.y || 0})`);
            });

        this.bubbleGroups = this.chartGroup.selectAll(".bubble-group")
            .data(data)
            .join("g")
            .attr("class", "bubble-group");

        this.bubbleGroups.append("circle")
            .attr("class", "bubble")
            .attr("r", d => this.radiusScale(d.reviews))
            .attr("fill", d => this.colorScale(this.getLabelField(d)))
            .attr("cursor", "pointer")
            .on("mouseover", (event, d) => {
                this.showTooltip(event, d);
            })
            .on("mouseout", () => this.hideTooltip());

        this.bubbleGroups.append("text")
            .attr("class", "country-label")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(d => {
                const label = this.getLabelField(d);
                return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Unknown";
            });

        this.bubbleGroups.on("click", (event, d) => this.handleClick(d));

        this.simulation.on("end", () => {
            data.forEach(d => {
                d.initialX = d.x;
                d.initialY = d.y;
            });
        });

        this.updateTitle();
        return this;
    }

    // Label  based on the current view.
    getLabelField(d) {
        const field = this.viewLevel === "neighborhood" ? "neighbourhood" : this.viewLevel;
        return d[field] || "Unknown";
    }

    // Updates the chart title based on the current level.
    updateTitle() {
        const cap = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        let title = "Reviews: Top 10 Countries";
        if (this.viewLevel === "city" && this.highlighted.country) {
            title = `Reviews: Top 10 Cities in ${cap(this.highlighted.country)}`;
        } else if (this.viewLevel === "neighborhood" && this.highlighted.city) {
            title = `Reviews: Top 10 Neighborhoods in ${cap(this.highlighted.city)}`;
        }
        this.title.text(title);
    }

    // Shows the tooltip with details on hover.
    showTooltip(event, d) {
        const cap = str => str ? str.toUpperCase() : "N/A";
        let content = `<strong>${cap(this.getLabelField(d))}</strong>`;
        
        if (this.viewLevel === "country") {
            content += `<br>Reviews: ${d.reviews.toLocaleString()}`;
        } else if (this.viewLevel === "city") {
            content += `<br>Country: ${cap(d.country)}<br>Reviews: ${d.reviews.toLocaleString()}`;
        } else if (this.viewLevel === "neighborhood") {
            content += `<br>City: ${cap(d.city)}<br>Country: ${cap(d.country)}<br>Reviews: ${d.reviews.toLocaleString()}`;
        }
        this.tooltip
            .style("display", "block")
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .html(content);
    }

    // Hides the tooltip on mouse out.
    hideTooltip() {
        this.tooltip
            .style("opacity", 0)
            .style("display", "none");
    }

    // Handles click events on bubbles to drill down.
    handleClick(d) {
        if (this.viewLevel === "country" && d.country) {
            if (this.drillCallback) this.drillCallback(d.country, null);
            this.showCityView(d.country);
        } else if (this.viewLevel === "city" && d.city) {
            if (this.drillCallback) this.drillCallback(d.country, d.city);
            this.showNeighborhoodView(d.country, d.city);
        }
    }

    // Handles back button clicks to navigate up a level.
    handleBackButton() {
        if (this.viewLevel === "neighborhood") {
            this.showCityView(this.highlighted.country);
            if (this.drillCallback) this.drillCallback(this.highlighted.country, null);
        } else if (this.viewLevel === "city") {
            this.showCountryView();
            if (this.drillCallback) this.drillCallback(null, null);
        }
    }

    // Shows the city view for a selected country.
    showCityView(country) {
        if (!this.allData || !country) {
            return this;
        }
        const countryData = this.allData.filter(d => d.country.toLowerCase() === country.toLowerCase());
        const cityData = Array.from(
            d3.rollup(countryData, v => d3.sum(v, d => d.numberOfReviews || 0), d => d.city),
            ([city, reviews]) => ({ city, country, reviews })
        ).sort((a, b) => b.reviews - a.reviews).slice(0, 10);
        this.viewLevel = "city";
        this.highlighted = { country, city: null, neighborhood: null };
        this.backButton.attr("opacity", 1);
        this.render(cityData, this.allData);
        return this;
    }

    // Shows the neighborhood view for a selected city.
    showNeighborhoodView(country, city) {
        if (!this.allData || !country || !city) {
            return this;
        }
        const cityData = this.allData.filter(d => 
            d.country.toLowerCase() === country.toLowerCase() && 
            d.city.toLowerCase() === city.toLowerCase()
        );
        const neighborhoodData = Array.from(
            d3.rollup(cityData, v => d3.sum(v, d => d.numberOfReviews || 0), d => d.neighbourhood),
            ([neighbourhood, reviews]) => ({ neighbourhood, city, country, reviews })
        )
        .filter(d => d.neighbourhood && d.neighbourhood.trim())
        .sort((a, b) => b.reviews - a.reviews)
        .slice(0, 10);
        this.viewLevel = "neighborhood";
        this.highlighted = { country, city, neighborhood: null };
        this.backButton.attr("opacity", 1);
        this.render(neighborhoodData, this.allData);
        return this;
    }

    // Shows the default country view with top 10 countries.
    showCountryView() {
        if (!this.originalData) return this;
        this.viewLevel = "country";
        this.highlighted = { country: null, city: null, neighborhood: null };
        this.backButton.attr("opacity", 0);
        this.render(this.originalData, this.allData);
        return this;
    }

    // Sets drill-down callback triggered on bubble clicks
    setDrillCallback(callback) {
        this.drillCallback = callback;
        return this;
    }

    // Sets all airbnb listing data and triggers initial render
    setData(fullData) {
        this.allData = fullData;
        this.originalData = this.getTopCountries(fullData);
        this.render(this.originalData, fullData);
        return this;
    }
    
    // Computes top 10 countries by number of reviews
    getTopCountries(data) {
        return Array.from(
            d3.rollup(data, v => d3.sum(v, d => d.numberOfReviews), d => d.country),
            ([country, reviews]) => ({ country, reviews })
        )
        .sort((a, b) => d3.descending(a.reviews, b.reviews))
        .slice(0, 10);
    }

    // Filters chart by the selected room type
    filterByRoomType(roomType = null) {
        let filtered = roomType
            ? this.allData.filter(d => d.roomType === roomType)
            : this.allData;
    
        this.originalData = this.getTopCountries(filtered);
        this.render(this.originalData, filtered);
        return this;
    }    
    
}