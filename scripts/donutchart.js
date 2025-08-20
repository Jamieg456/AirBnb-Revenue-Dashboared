
export default class DonutChart{ 

    width; height; margin;
    svg; chart; arcs; labels; title;
    data; sum;
    pieGenerator; arcGenerator; labelGenerator;
    clickCallback = null;
    selectedRoomType = null;

    // constructor for the SVG
    constructor(container, width, height, margin){ 

        this.width = width; 
        this.height = height;
        this.margin = margin;

        let innerWidth = this.width - this.margin[2] - this.margin[3],
            innerHeight = this.height - this.margin[0] - this.margin[1]; 
 
            this.svg = d3.select(container).append("svg")
                .classed("viz", true)
                .attr("viewBox", `0 0 ${this.width} ${this.height}`)
                .attr("preserveAspectRatio", "xMidYMid meet")
                .style("width", "100%")
                .style("height", "auto")
                .style("aspect-ratio", `${this.width} / ${this.height}`);
         
        
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]+innerWidth/2}, ${this.margin[0]+innerHeight/2})`);

        this.arcs = this.chart.selectAll ('path.arc');
        this.labels = this.chart.selectAll('text.label'); 

        this.title = this.svg.append('text')
            .classed('title', true)
            .attr('transform', `translate(${this.width/2},${this.margin[0]-30})`)
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .attr("y", -5);

        // data and shape generator
        this.pieGenerator = d3.pie()
            .padAngle(0.02)
            .value(d=>d[1]);
            
        // minimum dimensions
        let size = Math.min(innerWidth,innerHeight);

        this.arcGenerator = d3.arc()
            .innerRadius(size/4)
            .outerRadius(size/2-20);

        this.labelGenerator = d3.arc()
            .innerRadius(size/2-20)
            .outerRadius(size/2);
    } 

    //  Callback for slice click interaction
    onSliceClick(callback) {
        this.clickCallback = callback;
        return this;
    }

    // Updates pie slices
    #updateArcs(duration){ 
        const self = this;
    
        this.arcs = this.chart.selectAll('path.arc')
            .data(this.data, d=>d.data[0]) 
            .join(
                enter => enter.append('path')
                    .classed('arc', true)
                    .attr('cursor', 'pointer')
                    .attr('d', this.arcGenerator)
                    .attr('fill', d => d.data[0] === self.selectedRoomType ? 'orangered' : 'steelblue')
                    .on('mouseover', function (event, d) {
                        const isSelected = d.data[0] === self.selectedRoomType;
                        d3.select(this).attr('fill', isSelected ? 'steelblue' : 'orangered');
                    })
                    .on('mouseout', function (event, d) {
                        const isSelected = d.data[0] === self.selectedRoomType;
                        d3.select(this).attr('fill', isSelected ? 'orangered' : 'steelblue');
                    })
                    .on('click', function (event, d) {
                        self.selectedRoomType = self.selectedRoomType === d.data[0] ? null : d.data[0];
                        if (self.clickCallback) self.clickCallback(self.selectedRoomType);
                        self.render(self.data.map(d => d.data)); // re-render with updated selection
                    }),
                update => update,
                exit => exit.remove()
            );
    
        this.arcs.transition()
            .duration(duration)
            .attr('d', this.arcGenerator)
            .attr('fill', d => d.data[0] === self.selectedRoomType ? 'orangered' : 'steelblue');
    }    

    // Update the label positions around the arcs
    #updateLabels(duration){
        const format = d3.format('.1%');
        const padding = 14; // vertical space between labels
        const labelPositions = [];
    
        // pre-calc label positions
        this.data.forEach(d => {
            const [x, y] = this.labelGenerator.centroid(d);
            labelPositions.push({ x, y, data: d });
        });
    
        // Sort by Y for veritcal arrangement
        labelPositions.sort((a, b) => a.y - b.y);
    
        // Adjust Y to prevent any overlaps
        for (let i = 1; i < labelPositions.length; i++) {
            const prev = labelPositions[i - 1];
            const curr = labelPositions[i];
            if (Math.abs(curr.y - prev.y) < padding) {
                curr.y = prev.y + padding;
            }
        }
    
        // render adjusted labels
        this.labels = this.labels
            .data(labelPositions, d => d.data.data[0])
            .join('text')
            .classed('label', true);

        this.labels.transition()
            .duration(duration)
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .text(d => `${d.data.data[0]} - ${format(d.data.data[1] / this.sum)}`)
            .attr('text-anchor', d => {
                const angle = (d.data.startAngle + d.data.endAngle) / 2;
                return angle > Math.PI ? 'end' : 'start';
            });
    }
    
     
    // render the data for visualization
    render(dataset, {duration=700}={}){ 
        this.data = this.pieGenerator(dataset);
        this.sum = d3.sum(dataset, d=>d[1])
        this.#updateArcs(duration);
        this.#updateLabels(duration);
        return this;
    }

    // Sets title for chart
    setTitle(title=''){
        this.title.text(title);
        return this;
    }

    dataSource = []; // stores orignal full data

    // Set the data for filtering
    setData(data) {
        this.dataSource = data;
        return this;
    }

    // Update and filter chart based on location and level
    update(location, level = "country") {
        const filteredData = this.dataSource.filter(d => 
            !location || (level === "city" ? d.city === location : d.country === location)
        );
    
        const revenueByRoomType = d3.rollup(
            filteredData,
            v => d3.sum(v, d => d.prospectiveRevenue),
            d => d.roomType
        );
    
        const donutData = Array.from(revenueByRoomType, ([room, revenue]) => [room, revenue]);
        const locationLabel = location || "All Countries";
        
        this.render(donutData)
            .setTitle(`Revenue by Room Type in ${locationLabel}`);
    
        return this;
    }    
} 