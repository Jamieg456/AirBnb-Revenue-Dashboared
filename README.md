# Airbnb Data Visualization Project

This project is a data visualization application that uses D3.js and TopoJSON to create various charts and maps for airbnb listings in Europe.

## Project Structure

### Files and Directories

- `index.html`: The main HTML file that loads the visualizations' Dashboard.
- `data/`: Contains data files used for the visualizations.
  - `airbnb_listings.csv`: CSV file with Airbnb listings data.
  - `europe.topojson`: TopoJSON file with European map data.

- `libs/`: Contains external libraries.
  - `d3/`: Directory for D3.js library.
    - `d3.v7.min.js`: Minified D3.js library.
    - `LICENSE`: License for D3.js.
  - `topojson/`: Directory for TopoJSON library.
    - `topojson-client.v3.min.js`: Minified TopoJSON client library.
    - `LICENSE`: License for TopoJSON.

- `scripts/`: Contains JavaScript files for different visualizations.
  - `barchart.js`: Script for creating bar charts.
  - `barplot.js`: Script for creating bar plots.
  - `choropleth.js`: Script for creating choropleth maps.
  - `donutchart.js`: Script for creating donut charts.
  - `bubblechart.js`: Script for creating bubble charts.
  - `main.js`: Main script that initializes the visualizations.

- `styles/`: Contains CSS files for styling the visualizations.
  - `main.css`: Main CSS file for the project.

## Getting Started

### Prerequisites

- A web browser (e.g., Chrome, Firefox)
- A local server (e.g., [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for Visual Studio Code)

### Running the Project

1. Clone the repository to your local machine.
2. Open the project directory in your code editor.
3. Open `index.html` with a live server or any local server.
4. The visualizations should now be accessible in your web browser.

## Visualizations

- **Bar Chart**: Displays data in a bar chart format.
- **Bar Plot**: Displays data in a circular bar plot format.
- **Bubble Chart**: Displays data in a bubble chart format.
- **Choropleth Map**: Displays data on a map with different colors representing different values.
- **Donut Chart**: Displays data in a donut chart format.

## Libraries Used

- [D3.js](https://d3js.org/): A JavaScript library for producing dynamic, interactive data visualizations in web browsers.
- [TopoJSON](https://github.com/topojson/topojson): An extension of GeoJSON that encodes topology.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.