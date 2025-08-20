import ChoroplethMap from "./choropleth.js";
import DonutChart from './donutchart.js';
import BarChart from "./barchart.js";
import CircularBarplot from "./barplot.js";
import BubbleChart from './bubblechart.js'; 

// Global Variables (Selections)
let selectedCountry = null;
let selectedCity = null;
let selectedRoomType = null;

// Load data and initialize charts
const [topojsonData, data] = await Promise.all([
    d3.json("data/europe.topojson"),
    d3.csv('data/airbnb_listings.csv', d => ({
        roomID: d.Room_ID,
        name: d.Name,
        hostID: d.Host_ID,
        neighbourhood: d.Neighbourhood,
        roomType: d.Room_type,
        roomPrice: +d.Room_Price,
        numberOfReviews: +d.Number_of_reviews,
        roomsByHost: +d.Rooms_rent_by_the_host,
        availability: +d.Availibility,
        city: d.City,
        country: d.Country.trim().toLowerCase(),
        prospectiveRevenue: isNaN(+d.Prospective_Revenue) ? 0 : +d.Prospective_Revenue
    }))
]);

const countries = topojson.feature(topojsonData, topojsonData.objects.europe);

// Initialisation of charts

const donut = new DonutChart('#chart3', 600, 500, [60, 60, 60, 60]).setData(data);
const barchartHigh = new BarChart('#chart4', 600, 500, [60, 80, 80, 50]).setData(data);
const barchartLow = new BarChart('#chart5', 600, 500, [60, 80, 80, 50]).setData(data);
const barplot = new CircularBarplot('#chart2', 600, 500, [60, 30, 30, 30]).setData(data);
const bubble = new BubbleChart('#chart6', 600, 500);
const choropleth = new ChoroplethMap("#chart1", 400, 300)
    .baseMap(countries, d3.geoMercator)
    .renderRevenueData(data, (clickedCountry) => {
        if (selectedCountry !== clickedCountry) {
            selectedCountry = clickedCountry;
            selectedCity = null; // <-- RESET THE CITY SELECTION HERE
        } else {
            selectedCountry = null;
            selectedCity = null; // also reset city when deselecting country
        }
        updateCharts();
    });
    
// Populate Dropdown
initCountryDropdown();

// Setup initial rendering
updateCharts();

// ------------------------------------------
// Helper functions and event handler bindings
// ------------------------------------------

// Populate dropdown wtih country list, and set change handler
function initCountryDropdown() {
    const uniqueCountries = [...new Set(data.map(d => d.country))];

    const countryDropdown = d3.select("#countryDropdown");
    countryDropdown
        .selectAll("option")
        .data(uniqueCountries)
        .join("option")
        .attr("value", d => d)
        .text(d => d);

    countryDropdown.on("change", function () {
        selectedCountry = d3.select(this).property("value");
        selectedCity = null;
        updateCharts();
    });
}

// Room type slice click handler for donut chart
donut.onSliceClick(roomType => {
    selectedRoomType = roomType;
    updateCharts();
});

// Bar chart click handlers
barchartHigh.onBarClick(handleBarChartClick);
barchartLow.onBarClick(handleBarChartClick);

// Handles city/country click logic from bar charts
function handleBarChartClick(label) {
    if (!selectedCountry) {
        selectedCountry = label;
        selectedCity = null;
    } else {
        selectedCity = label;
    }
    updateCharts();
}

// Handles click on circular barplot (country or city)
barplot.onBarClick(label => {
    if (!selectedCity) {
        if (!selectedCountry) selectedCountry = label;
        else selectedCity = label;
        updateCharts();
    }
});

// Handles click/drill-down from bubble chart
bubble.setDrillCallback((country, city) => {
    selectedCountry = country;
    selectedCity = city;
    updateCharts();
});

// Slider change handler to update number of bars on ciruclar barplot
d3.select("#barCountSlider").on("input", function () {
    const value = +this.value;
    d3.select("#barCountValue").text(value);
    d3.select("#sliderLabel").text(`Number of Bars: ${value}`);
    if (barplot.currentData) {
        barplot.setMaxLabels(value).render(barplot.currentData);
    }
});

// Reset all selections
document.getElementById("resetButton").addEventListener("click", resetSelections);

// ----------------------
// Chart Updates
// ----------------------

// Update all chartss with current states
function updateCharts(country = selectedCountry, city = selectedCity, roomType = selectedRoomType) {
    selectedCountry = country;
    selectedCity = city;
    selectedRoomType = roomType;

    updateDropdownSelection();
    highlightCountryOnMap();
    updateBubbleChart();
    updateDonutChart();
    updateBarPlot();
    updateBarCharts();

    // Disable some chart interactivity if a city is selected
    const citySelected = Boolean(selectedCity);
    barchartHigh.setInteractive(!citySelected);
    barchartLow.setInteractive(!citySelected);
    barplot.setInteractive(!citySelected);

    if (!selectedCountry) {
        barchartHigh.clearSelection();
        barchartLow.clearSelection();
    }
}

// Set dropdown to show currwent selected country
function updateDropdownSelection() {
    d3.select("#countryDropdown").property("value", selectedCountry || "");
}

// Highlight current selected country on the map
function highlightCountryOnMap() {
    choropleth.highlightCountry(selectedCountry);
}

// Updates the bublechart with current filters
function updateBubbleChart() {
    const filteredData = selectedRoomType
        ? data.filter(d => d.roomType === selectedRoomType)
        : data;

    bubble.setData(filteredData);
    if (selectedCountry && selectedCity) {
        bubble.showNeighborhoodView(selectedCountry, selectedCity);
    } else if (selectedCountry) {
        bubble.showCityView(selectedCountry);
    } else {
        bubble.showCountryView();
    }
}

// Update donut based on level and location
function updateDonutChart() {
    const level = selectedCity ? "city" : "country";
    const location = selectedCity || selectedCountry;
    donut.update(location, level, selectedRoomType);
}

// Update high and low revenue bar charts
function updateBarCharts() {
    const level = selectedCity ? "city" : "country";
    const location = selectedCity || selectedCountry;
    barchartHigh.update(location, level, selectedRoomType, 'high');
    barchartLow.update(location, level, selectedRoomType, 'low');
}

// Update circular barplot
function updateBarPlot() {
    const level = selectedCity ? "city" : "country";
    const location = selectedCity || selectedCountry;
    barplot.update(location, level, selectedRoomType);
}

// Clears all selections and reset dashboard to default state
function resetSelections() {
    selectedCountry = null;
    selectedCity = null;
    selectedRoomType = null;
    donut.selectedRoomType = null;
    updateCharts();
}