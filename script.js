/* =========================================
   GLOBAL HEALTH EXPLORER — SCENE 1
   ========================================= */

// -----------------------------------------
// 1. LOAD AND PREPARE THE DATA
// -----------------------------------------

// Import D3 version 7.9.0 as a JavaScript module.
// This is the same approach used in our portfolio lab.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// Load the CSV file from the data folder
const data = await d3.csv('data/Data_ready_d3js.csv');

// Check the data in the browser console.
console.log('Total rows:', data.length);
console.log('CSV columns:', data.columns);

// Use the exact indicator column names
const indicators = {
    poverty: 'Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)',
    uhc: 'UHC_overall',
    life: 'Life expectancy at birth, total (years) [SP.DYN.LE00.IN]',
    //expenditure: 'Current health expenditure per capita (current US$) [SH.XPD.CHEX.PC.CD]'
    expenditure: 'Current health expenditure (% of GDP) [SH.XPD.CHEX.GD.ZS]'
};

// Convert the relevant columns from text to numbers.
// A blank CSV cell becomes NaN (a missing value).
data.forEach(d => {
    d.Year = +d.Year;

    d.poverty = d[indicators.poverty] === ''
        ? NaN : +d[indicators.poverty];

    d.uhc = d[indicators.uhc] === ''
        ? NaN : +d[indicators.uhc];

    d.life = d[indicators.life] === ''
        ? NaN : +d[indicators.life];

    d.expenditure = d[indicators.expenditure] === ''
        ? NaN : +d[indicators.expenditure];
});

// Create a separate array for Scene 1.
// The original "data" array still includes all countries.
const aggregateData = data.filter(d =>
    d.Data_Level === 'World' ||
    d.Data_Level === 'Region' ||
    d.Data_Level === 'Income'
);

console.log('Aggregate rows:', aggregateData.length);


// -----------------------------------------
// 2. DEFINE COLORS
// -----------------------------------------

// These colors match our website's palette.
const colors = {
    world: '#182A36',
    teal: '#046d6a',
    orange:'#f57105e6',
    blue: '#71a7de',
    purple: '#c097f3',
    green: '#38ca5a',
    pink: '#f4a3b0',
    gold: '#B28A25'
};

// Assign one consistent color to each group.
// This ensures the same group has the same
// color across all four charts.
const groupColors = {
    'East Asia & Pacific': colors.teal,
    'Europe & Central Asia': colors.blue,
    'Latin America & Caribbean': colors.orange,
    'Middle East, North Africa, Afghanistan & Pakistan': colors.purple,
    'North America': colors.green,
    'South Asia': colors.pink,
    'Sub-Saharan Africa': colors.gold,

    'High income': colors.teal,
    'Upper middle income': colors.blue,
    'Lower middle income': colors.orange,
    'Low income': colors.purple,

    'World': colors.world
};


// -----------------------------------------
// 3. DEFINE THE FOUR CHARTS
// -----------------------------------------

// Each object describes one chart.
// "container" matches an ID in index.html.
// "variable" matches a numeric property
// we created when preparing the data.
const charts = [
    {
        container: '#poverty-chart',
        variable: 'poverty',
        unit: '%',
        decimals: 1
    },
    {
        container: '#uhc-chart',
        variable: 'uhc',
        unit: '',
        decimals: 0
    },
    {
        container: '#life-chart',
        variable: 'life',
        unit: ' years',
        decimals: 1
    },
    {
        container: '#expenditure-chart',
        variable: 'expenditure',
        unit: '%',
        decimals: 1
    }
];


// -----------------------------------------
// 4. KEEP TRACK OF THE SELECTED VIEW
// -----------------------------------------

// Start by showing World Bank regions.
let currentView = 'Region';

// Remember which group the reader selected.
// null means no group is selected.
let selectedGroup = null;

// Remember which group the mouse is currently hovering over.
let hoveredGroup = null;

// Update line appearance across ALL four charts.
function updateHighlight() {

    // Hover takes priority over a clicked selection.
    const activeGroup = hoveredGroup || selectedGroup;

    // Find every data line in every chart.
    d3.selectAll('.chart .series-line')
        .attr('opacity', function () {

            // Read the group name stored on this line.
            const name = d3.select(this).attr('data-group');

            // When nothing is selected, show every line.
            if (activeGroup === null) {
                return name === 'World' ? 1 : 0.9;
            }

            // Keep the selected line and World reference visible.
            return name === activeGroup || name === 'World'
                ? 1
                : 0.12;
        })
        .attr('stroke-width', function () {

            const name = d3.select(this).attr('data-group');

            // Make the selected line thicker.
            if (name === activeGroup) {
                return 4;
            }

            // Keep World prominent.
            return name === 'World' ? 3 : 2.5;
        });

    // Update the legend to match the selected group.
    d3.selectAll('#legend .legend-item')
        .classed('selected', function () {
            return d3.select(this).attr('data-group') === selectedGroup;
        })
        .classed('dimmed', function () {
            const name = d3.select(this).attr('data-group');

            return activeGroup !== null &&
                name !== activeGroup &&
                name !== 'World';
        });
}

// -----------------------------------------
// 5. DRAW ONE LINE CHART
// -----------------------------------------

// This function can draw any of our four charts.
// It receives a chart configuration as an argument.
function renderLineChart(chart) {

    // Find the HTML div for this chart.
    const container = d3.select(chart.container);

    // Remove the previous SVG before redrawing.
    // This prevents duplicate charts when switching views.
    container.selectAll('svg, .chart-tooltip').remove();

    // Choose World + Region OR World + Income rows.
    // We start at 2000 to focus on recent decades.
    const chartData = aggregateData.filter(d =>
        (d.Data_Level === 'World' ||
         d.Data_Level === currentView) &&
        d.Year >= 2000 &&
        Number.isFinite(d[chart.variable])
    );

    // Group the rows by their World Bank group name.
    // Each group will become one line.
    const groupedData = d3.groups(
        chartData,
        d => d['Country Name']
    );

    // Sort each group's observations by year.
    groupedData.forEach(([name, values]) => {
        values.sort((a, b) => a.Year - b.Year);
    });

    // -------------------------------------
    // SVG DIMENSIONS
    // -------------------------------------

    // Internal SVG dimensions.
    const width = 620;
    const height = 340;

    // Leave room around the plot for the axes.
    const margin = {
        top: 20,
        right: 20,
        bottom: 45,
        left: 60
    };

    // Calculate the usable plotting area.
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create an SVG inside the chart's HTML div.
    const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'img')
        .attr('aria-label', `Line chart showing ${chart.variable} over time`);

    // Create a group for the plotting area.
    // "translate" moves it away from the edges.
    const plot = svg
        .append('g')
        .attr(
            'transform',
            `translate(${margin.left}, ${margin.top})`
        );

    // -------------------------------------
    // SCALES
    // -------------------------------------

    // The x-scale converts years to horizontal positions.
    const x = d3.scaleLinear()
        .domain([2000, 2024])
        .range([0, innerWidth]);

    // Find the largest value in this chart.
    const maxValue = d3.max(
        chartData,
        d => d[chart.variable]
    );

    // Choose the minimum y-axis value for each indicator.
    // Life expectancy starts at 40 years.
    // UHC service coverage starts at 20.
    // Poverty and healthcare expenditure still start at 0.
    let minValue = 0;

    if (chart.variable === 'life') {
        minValue = 50;
    }

    if (chart.variable === 'uhc') {
    minValue = 20;
    }

    // Create the vertical scale using our chosen minimum.
    const y = d3.scaleLinear()
        .domain([minValue, maxValue || minValue + 1])
        .nice()
        .range([innerHeight, 0]);

    // -------------------------------------
    // GRIDLINES
    // -------------------------------------

    // Create horizontal gridlines using a y-axis
    // whose tick marks extend across the chart.
    plot.append('g')
        .attr('class', 'grid')
        .call(
            d3.axisLeft(y)
                .ticks(5)
                .tickSize(-innerWidth)
                .tickFormat('')
        )
        .call(g => g.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', '#E5E9E7');

    // -------------------------------------
    // AXES
    // -------------------------------------

    // Add the horizontal year axis.
    plot.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(
            d3.axisBottom(x)
                .ticks(6)
                .tickFormat(d3.format('d'))
        );

    // Add the vertical value axis.
    plot.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5));


    // -------------------------------------
    // LINE GENERATOR
    // -------------------------------------

    // Define how D3 should connect data points.
    const line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[chart.variable]));

    // Draw regional/income lines first,
    // so the World line can appear on top.
    const orderedGroups = groupedData.sort((a, b) => {
        if (a[0] === 'World') return 1;
        if (b[0] === 'World') return -1;
        return a[0].localeCompare(b[0]);
    });

    // Create a tooltip inside this chart container.
    // It will appear when the mouse hovers over a line.
    const tooltip = container
        .append('div')
        .attr('class', 'chart-tooltip')
        .style('display', 'none');

    // Draw one line for each region or income group.
    orderedGroups.forEach(([name, values]) => {
        // Check whether this is the World reference line.
        const isWorld = name === 'World';

        // Create a group to hold this line and its hover area.
        const series = plot.append('g')
            .attr('class', 'chart-series');

        // Draw the visible line.
        series.append('path')
            .datum(values)
            .attr('class', 'series-line')
            .attr('data-group', name)
            .attr('fill', 'none')
            .attr('stroke', groupColors[name] || colors.blue)
            .attr('stroke-width', isWorld ? 3 : 2.5)
            .attr('stroke-dasharray', isWorld ? '7,5' : null)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', line)
            .style('pointer-events', 'none');

        // Draw an invisible, wider line over the visible one.
        // This makes hovering much easier than targeting
        // a thin 2-pixel line.
        series.append('path')
            .datum(values)
            .attr('class', 'hover-line')
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 16)
            .attr('d', line)
            .style('pointer-events', 'stroke')
            .style('cursor', 'pointer')

            // When the mouse enters this line:
            .on('mouseenter', function () {
                hoveredGroup = name;
                updateHighlight();

                tooltip.style('display', 'block');
            })

            // When the mouse moves along this line:
            .on('mousemove', function (event) {

                // Get the mouse position inside the plot.
                const [mouseX] = d3.pointer(event, plot.node());

                // Convert the mouse position into a year.
                const mouseYear = x.invert(mouseX);

                // Find the observation closest to that year.
                const closest = d3.least(
                    values,
                    d => Math.abs(d.Year - mouseYear)
                );

                // Stop if this group has no observations.
                if (!closest) return;

                // Format the value for display.
                const formattedValue =
                    closest[chart.variable].toFixed(chart.decimals)
                    + chart.unit;

                // Show the group, year and value.
                tooltip.html(`
                    <strong>${name}</strong>
                    <div>Year: ${closest.Year}</div>
                    <div>Value: ${formattedValue}</div>
                `);

                // Position the tooltip near the mouse.
                const [px, py] = d3.pointer(
                    event,
                    container.node()
                );

                tooltip
                    .style('left', `${px + 12}px`)
                    .style('top', `${py - 12}px`);
            })

            // When the mouse leaves the line:
            .on('mouseleave', function () {
                hoveredGroup = null;
                tooltip.style('display', 'none');
                updateHighlight();
            })

            // Clicking a line selects that group in all charts.
            .on('click', function () {

                // Clicking the same group again clears it.
                selectedGroup =
                    selectedGroup === name ? null : name;

                updateHighlight();
            });
    });

    // Apply any selection after drawing this chart.
    updateHighlight();
}

// -----------------------------------------
// 6. CREATE THE LEGEND
// -----------------------------------------

function renderLegend() {

    // Select the legend container from HTML.
    const legend = d3.select('#legend');

    // Clear the previous legend.
    legend.selectAll('*').remove();

    // Define the order we want for the income groups.
    const incomeOrder = [
        'High income',
        'Upper middle income',
        'Lower middle income',
        'Low income'
    ];

    // Get the names available in the selected view.
    const groupNames = Array.from(
        new Set(
            aggregateData
                .filter(d => d.Data_Level === currentView)
                .map(d => d['Country Name'])
        )
    );

    // Sort the names differently depending on the view.
    if (currentView === 'Income') {

        // Sort by income level rather than alphabetically.
        groupNames.sort((a, b) =>
            incomeOrder.indexOf(a) - incomeOrder.indexOf(b)
        );

    } else {

        // Keep alphabetical order for World Bank regions.
        groupNames.sort();
    }

    // Always show World at the end of the legend.
    groupNames.push('World');

    // Create one legend item per group.
    const items = legend
        .selectAll('.legend-item')
        .data(groupNames)
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr('class', 'legend-item')
        .attr('data-group', d => d)

        // Click to select or deselect a group.
        .on('click', function (event, name) {
            selectedGroup =
                selectedGroup === name ? null : name;

            updateHighlight();
        });

    // Add a colored line inside each legend button
    items.append('span')
        .attr('class', 'legend-color')
        .style('border-top', d =>
            `4px ${d === 'World' ? 'dashed' : 'solid'} ` +
            (groupColors[d] || colors.blue)
        );

    // Add the group name beside the colored line.
    items.append('span')
        .text(d => d);

    // Reflect the current selection.
    updateHighlight();
}


// -----------------------------------------
// 7. DRAW ALL FOUR CHARTS
// -----------------------------------------

function renderAllCharts() {

    // Draw each chart using the same function.
    charts.forEach(chart => {
        renderLineChart(chart);
    });

    // Update the legend too.
    renderLegend();
}


// -----------------------------------------
// 8. MAKE THE BUTTONS INTERACTIVE
// -----------------------------------------

// Select the buttons created in index.html.
const regionButton = d3.select('#region-btn');
const incomeButton = d3.select('#income-btn');

// When the Region button is clicked:
regionButton.on('click', () => {

    // Change the selected view.
    currentView = 'Region';

    // Reset highlighting when switching views.
    selectedGroup = null;
    hoveredGroup = null;

    // Update the active button styling.
    regionButton.classed('active', true);
    incomeButton.classed('active', false);

    // Redraw the charts and legend.
    renderAllCharts();
});

// When the Income Level button is clicked:
incomeButton.on('click', () => {

    // Change the selected view.
    currentView = 'Income';

    // Reset highlighting when switching views.
    selectedGroup = null;
    hoveredGroup = null;

    // Update the active button styling.
    incomeButton.classed('active', true);
    regionButton.classed('active', false);

    // Redraw the charts and legend.
    renderAllCharts();
});


// -----------------------------------------
// 9. INITIAL RENDER
// -----------------------------------------

    // Draw the charts when the page first loads.
    renderAllCharts();





/* =========================================
   GLOBAL HEALTH EXPLORER — SCENE 2
   Fixed 2000 baseline + animated comparison
========================================= */

// -----------------------------------------
// 1. EXACT CSV INDICATOR NAMES
// -----------------------------------------

const scene2Indicators = {
    catastrophic:
        'Proportion of population spending more than 25% of household consumption or income on out-of-pocket health care expenditure (%) [SH.UHC.OOPC.25.ZS]',

    impoverishment:
        'Proportion of population pushed further below the $3.65 ($ 2017 PPP) poverty line by out-of-pocket health care expenditure (%) [SH.UHC.FBP2.ZS]'
};

// Convert values to numbers.
// Missing values must NOT become zero.
function scene2ToNumber(value) {

    if (value === '' || value === null ||
        value === undefined) {
        return NaN;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : NaN;
}

// Add short names for the two indicators.
data.forEach(d => {

    d.catastrophic = scene2ToNumber(
        d[scene2Indicators.catastrophic]
    );

    d.impoverishment = scene2ToNumber(
        d[scene2Indicators.impoverishment]
    );
});


// -----------------------------------------
// 2. PREPARE SCENE 2 DATA
// -----------------------------------------

// Include Region and Income only.
// Keep rows where at least one indicator is available.
const scene2Data = data.filter(d =>
    (d.Data_Level === 'Region' ||
     d.Data_Level === 'Income') &&
    (Number.isFinite(d.catastrophic) ||
     Number.isFinite(d.impoverishment))
);

// Use actual observation years from the CSV.
const scene2Years = Array.from(
    new Set(scene2Data.map(d => +d.Year))
)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

// The baseline never changes.
const scene2BaselineYear = 2000;

console.log('Scene 2 years:', scene2Years);
console.log('Scene 2 rows:', scene2Data.length);


// -----------------------------------------
// 3. SCENE 2 SETTINGS
// -----------------------------------------

// These variables are independent of Scene 1.
let scene2View = 'Region';

let scene2Year = scene2Years.includes(2000)
    ? 2000
    : scene2Years[0];

let scene2Timer = null;

// Hover temporarily highlights a group.
let scene2HoveredGroup = null;

// Click keeps a group selected.
let scene2SelectedGroup = null;

// Natural hierarchy for income groups.
const scene2IncomeOrder = [
    'High income',
    'Upper middle income',
    'Lower middle income',
    'Low income'
];

// Both charts share the same year and view.
const scene2Charts = [
    {
        container: '#catastrophic-chart',
        variable: 'catastrophic'
    },
    {
        container: '#impoverishment-chart',
        variable: 'impoverishment'
    }
];


// -----------------------------------------
// 4. HELPER FUNCTIONS
// -----------------------------------------

// Get all group names for the current view.
function scene2Names() {

    return Array.from(
        new Set(
            scene2Data
                .filter(d => d.Data_Level === scene2View)
                .map(d => d['Country Name'])
        )
    );
}

// Find one group's value for a particular year.
function scene2Value(name, variable, year) {

    const row = scene2Data.find(d =>
        d.Data_Level === scene2View &&
        d['Country Name'] === name &&
        +d.Year === year
    );

    return row ? row[variable] : NaN;
}

// Decide the fixed order of bars.
//
// Region view:
// Each chart sorts by its OWN 2000 values.
//
// Income view:
// Both charts use the natural income hierarchy.
function scene2Order(variable) {

    const names = scene2Names();

    if (scene2View === 'Income') {

        return scene2IncomeOrder.filter(name =>
            names.includes(name)
        );
    }

    return names.sort((a, b) => {

        const aValue = scene2Value(
            a, variable, scene2BaselineYear
        );

        const bValue = scene2Value(
            b, variable, scene2BaselineYear
        );

        // Missing baseline values go last.
        if (!Number.isFinite(aValue) &&
            !Number.isFinite(bValue)) {
            return a.localeCompare(b);
        }

        if (!Number.isFinite(aValue)) return 1;
        if (!Number.isFinite(bValue)) return -1;

        // Highest 2000 value first.
        return bValue - aValue || a.localeCompare(b);
    });
}

// Reuse Scene 1's existing group colors.
function scene2Color(name) {

    return groupColors[name] || colors.blue;
}

// Create a faded version of the same color
// for the 2000 baseline bar.
function scene2PaleColor(name) {

    return d3.interpolateRgb(
        scene2Color(name),
        '#FFFFFF'
    )(0.65);
}

// Format the change in percentage points.
function scene2ChangeText(change) {

    if (!Number.isFinite(change)) return 'N/A';

    if (Math.abs(change) < 0.05) return '0.0 pp';

    const sign = change > 0 ? '+' : '−';

    return `${sign}${Math.abs(change).toFixed(1)} pp`;
}

// Red = financial hardship increased.
// Green = financial hardship decreased.
function scene2ChangeColor(change) {

    if (!Number.isFinite(change) ||
        Math.abs(change) < 0.05) {
        return '#66747D';
    }

    return change > 0
        ? '#C74343'
        : '#238653';
}

// Format a percentage value.
function scene2ValueText(value) {

    return Number.isFinite(value)
        ? `${value.toFixed(1)}%`
        : 'N/A';
}


// -----------------------------------------
// 5. CREATE THE YEAR DROPDOWN
// -----------------------------------------

const scene2YearSelect = d3.select('#scene2-year');

scene2YearSelect
    .selectAll('option')
    .data(scene2Years)
    .join('option')
    .attr('value', d => d)
    .text(d => d);


// -----------------------------------------
// 6. CREATE THE CLICKABLE LEGEND
// -----------------------------------------

function renderScene2Legend() {

    // The legend order is alphabetical for regions.
    // This does not affect the chart rankings.
    const names = scene2View === 'Region'
        ? scene2Names().sort((a, b) =>
            a.localeCompare(b)
        )
        : scene2IncomeOrder.filter(name =>
            scene2Names().includes(name)
        );

    const items = d3.select('#scene2-legend')
        .selectAll('.legend-item')
        .data(names, d => d)
        .join('button')
        .attr('type', 'button')
        .attr('class', 'legend-item')
        .attr('data-group', d => d);

    // Add each group's color.
    items
        .selectAll('.legend-color')
        .data(d => [d])
        .join('span')
        .attr('class', 'legend-color')
        .style('background-color', d =>
            scene2Color(d)
        );

    // Add each group's name.
    items
        .selectAll('.legend-name')
        .data(d => [d])
        .join('span')
        .attr('class', 'legend-name')
        .text(d => d);

    // Click to select; click again to clear.
    items.on('click', (event, name) => {

        scene2SelectedGroup =
            scene2SelectedGroup === name
                ? null
                : name;

        updateScene2Highlight();
    });

    updateScene2Highlight();
}


// -----------------------------------------
// 7. DRAW ONE HORIZONTAL BAR CHART
// -----------------------------------------

function renderScene2Chart(chart, animate = true) {

    const container = d3.select(chart.container);

    // The order is based on 2000 and stays fixed.
    const names = scene2Order(chart.variable);

    // Match each group's 2000 and current-year values.
    const chartData = names.map(name => {

        const baseline = scene2Value(
            name,
            chart.variable,
            scene2BaselineYear
        );

        const current = scene2Value(
            name,
            chart.variable,
            scene2Year
        );

        return {
            name: name,
            baseline: baseline,
            current: current,
            change: current - baseline
        };
    });

    // -------------------------------------
    // CHART DIMENSIONS
    // -------------------------------------

    const width = 700;

    const margin = {
        top: 20,
        right: 100,
        bottom: 48,
        left: 230
    };

    const rowHeight = 48;

    const innerHeight = names.length * rowHeight;

    const innerWidth =
        width - margin.left - margin.right;

    const height =
        margin.top + innerHeight + margin.bottom;

    // Create SVG once and reuse it.
    let svg = container.select('svg');

    if (svg.empty()) {

        svg = container.append('svg');
    }

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create or reuse the plotting area.
    let plot = svg.select('.scene2-plot');

    if (plot.empty()) {

        plot = svg
            .append('g')
            .attr('class', 'scene2-plot')
            .attr(
                'transform',
                `translate(${margin.left},${margin.top})`
            );
    }

    // -------------------------------------
    // SCALES
    // -------------------------------------

    // Fixed scale for each indicator across
    // all available years and both views.
    const maxValue = d3.max(
        scene2Data,
        d => Number.isFinite(d[chart.variable])
            ? d[chart.variable]
            : 0
    ) || 1;

    const x = d3.scaleLinear()
        .domain([0, maxValue])
        .nice()
        .range([0, innerWidth]);

    // ScaleBand gives each group a fixed row.
    const y = d3.scaleBand()
        .domain(names)
        .range([0, innerHeight])
        .padding(0.25);

    const duration = animate ? 1100 : 0;

    // -------------------------------------
    // X AXIS
    // -------------------------------------

    plot
        .selectAll('.scene2-x-axis')
        .data([null])
        .join('g')
        .attr('class', 'axis scene2-x-axis')
        .attr(
            'transform',
            `translate(0,${innerHeight})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(4)
                .tickFormat(d => `${d}%`)
        );

    // -------------------------------------
    // BAR GROUPS
    // -------------------------------------

    const groups = plot
        .selectAll('.scene2-bar-group')
        .data(chartData, d => d.name);

    groups.exit().remove();

    // Create groups that do not exist yet.
    const entered = groups
        .enter()
        .append('g')
        .attr('class', 'scene2-bar-group');

    // Pale 2000 baseline bar.
    entered
        .append('rect')
        .attr('class', 'scene2-baseline-bar')
        .attr('rx', 4);

    // Strong-colored current-year bar.
    entered
        .append('rect')
        .attr('class', 'scene2-current-bar')
        .attr('rx', 4);

    // Dashed marker for the 2000 value.
    entered
        .append('line')
        .attr('class', 'scene2-baseline-marker');

    // Group name.
    entered
        .append('text')
        .attr('class', 'scene2-name');

    // Current percentage.
    entered
        .append('text')
        .attr('class', 'scene2-value');

    // Change in percentage points.
    entered
        .append('text')
        .attr('class', 'scene2-change');

    const allGroups = entered.merge(groups);

    const barHeight = y.bandwidth();

    // Make the current bar slightly thinner so
    // the pale baseline remains visible.
    const currentHeight = barHeight * 0.68;

    // Keep rows fixed throughout playback.
    allGroups.attr('transform', d =>
        `translate(0,${y(d.name)})`
    );

    // -------------------------------------
    // PALE BASELINE BARS (2000)
    // -------------------------------------

    allGroups
        .select('.scene2-baseline-bar')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', barHeight)
        .attr('width', d =>
            Number.isFinite(d.baseline)
                ? x(d.baseline)
                : 0
        )
        .attr('fill', d =>
            scene2PaleColor(d.name)
        );

    // Baseline marker.
    allGroups
        .select('.scene2-baseline-marker')
        .attr('x1', d =>
            Number.isFinite(d.baseline)
                ? x(d.baseline)
                : 0
        )
        .attr('x2', d =>
            Number.isFinite(d.baseline)
                ? x(d.baseline)
                : 0
        )
        .attr('y1', -2)
        .attr('y2', barHeight + 2)
        .attr('stroke', '#182A36')
        .attr('stroke-width', 1.3)
        .attr('stroke-dasharray', '3,2')
        .attr('opacity', d =>
            Number.isFinite(d.baseline)
                ? 0.75
                : 0
        );

    // -------------------------------------
    // ANIMATED CURRENT-YEAR BARS
    // -------------------------------------

    allGroups
        .select('.scene2-current-bar')
        .interrupt()
        .attr('x', 0)
        .attr(
            'y',
            (barHeight - currentHeight) / 2
        )
        .attr('height', currentHeight)
        .attr('fill', d =>
            scene2Color(d.name)
        )
        .transition()
        .duration(duration)
        .attr('width', d =>
            Number.isFinite(d.current)
                ? x(d.current)
                : 0
        );

    // -------------------------------------
    // GROUP NAMES
    // -------------------------------------

    allGroups
        .select('.scene2-name')
        .attr('x', -12)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#182A36')
        .text(d =>
            d.name ===
            'Middle East, North Africa, Afghanistan & Pakistan'
                ? 'MENA, Afghanistan & Pakistan'
                : d.name
        );

    // -------------------------------------
    // CURRENT PERCENTAGE LABELS
    // -------------------------------------

    allGroups
        .select('.scene2-value')
        .interrupt()
        .attr('y', barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('fill', '#182A36')
        .text(d =>
            scene2ValueText(d.current)
        )
        .transition()
        .duration(duration)
        .attr('x', d =>
            Number.isFinite(d.current)
                ? x(d.current) + 7
                : 7
        );

    // -------------------------------------
    // PERCENTAGE-POINT CHANGE LABELS
    // -------------------------------------

    // Show the difference on the far right.
    allGroups
        .select('.scene2-change')
        .attr('x', innerWidth + 95)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', d =>
            scene2ChangeColor(d.change)
        )
        .text(d =>
            scene2ChangeText(d.change)
        );

    // -------------------------------------
    // HOVER INFORMATION
    // -------------------------------------

    // Native browser tooltip with exact values.
    allGroups
        .selectAll('title')
        .data(d => [d])
        .join('title')
        .text(d =>
            `${d.name}\n` +
            `2000: ${scene2ValueText(d.baseline)}\n` +
            `${scene2Year}: ${scene2ValueText(d.current)}\n` +
            `Change: ${scene2ChangeText(d.change)}`
        );

    // Hover highlights the same group in both charts.
    // Click keeps the selection active.
    allGroups
        .on('mouseenter', (event, d) => {

            scene2HoveredGroup = d.name;

            updateScene2Highlight();
        })
        .on('mouseleave', () => {

            scene2HoveredGroup = null;

            updateScene2Highlight();
        })
        .on('click', (event, d) => {

            scene2SelectedGroup =
                scene2SelectedGroup === d.name
                    ? null
                    : d.name;

            updateScene2Highlight();
        });

    updateScene2Highlight();
}


// -----------------------------------------
// 8. LINKED HIGHLIGHTING
// -----------------------------------------

function updateScene2Highlight() {

    // Hover takes priority over a selected group.
    const activeGroup =
        scene2HoveredGroup || scene2SelectedGroup;

    // Highlight matching bars in both charts.
    // Important: your HTML section ID is #scene2.
    d3.selectAll('#scene2 .scene2-bar-group')
        .attr('opacity', d => {

            if (activeGroup === null) return 1;

            return d.name === activeGroup ? 1 : 0.20;
        });

    // Update legend selection and dimming.
    d3.selectAll('#scene2-legend .legend-item')

        .classed('selected', function () {

            return d3.select(this)
                .attr('data-group') ===
                scene2SelectedGroup;
        })

        .classed('dimmed', function () {

            const name = d3.select(this)
                .attr('data-group');

            return activeGroup !== null &&
                   name !== activeGroup;
        });
}


// -----------------------------------------
// 9. UPDATE BOTH CHARTS
// -----------------------------------------

function renderScene2(animate = true) {

    // Update the compact current-year display.
    d3.select('#scene2-current-year')
        .text(scene2Year);

    // Synchronize the year dropdown.
    scene2YearSelect.property('value', scene2Year);

    // Both charts display the same observation year.
    scene2Charts.forEach(chart => {

        renderScene2Chart(chart, animate);
    });

    updateScene2Highlight();
}


// -----------------------------------------
// 10. PLAY / PAUSE
// -----------------------------------------

const scene2PlayButton =
    d3.select('#scene2-play-btn');

function stopScene2Playback() {

    if (scene2Timer !== null) {

        scene2Timer.stop();

        scene2Timer = null;
    }

    scene2PlayButton.text('▶ Play');
}

function startScene2Playback() {

    if (scene2Years.length < 2) return;

    // Restart from the beginning if already at the end.
    if (scene2Year ===
        scene2Years[scene2Years.length - 1]) {

        scene2Year = scene2Years[0];

        renderScene2(false);
    }

    scene2PlayButton.text('❚❚ Pause');

    // Advance through actual observation years only.
    scene2Timer = d3.interval(() => {

        const nextIndex =
            scene2Years.indexOf(scene2Year) + 1;

        if (nextIndex >= scene2Years.length) {

            stopScene2Playback();
            return;
        }

        scene2Year = scene2Years[nextIndex];

        renderScene2(true);

        // Leave the final year visible.
        if (nextIndex === scene2Years.length - 1) {

            stopScene2Playback();
        }

    }, 2200);
}

scene2PlayButton.on('click', () => {

    if (scene2Timer !== null) {

        stopScene2Playback();

    } else {

        startScene2Playback();
    }
});


// -----------------------------------------
// 11. MANUAL YEAR SELECTION
// -----------------------------------------

scene2YearSelect.on('change', function () {

    stopScene2Playback();

    scene2Year = +this.value;

    renderScene2(true);
});


// -----------------------------------------
// 12. REGION / INCOME BUTTONS
// -----------------------------------------

const scene2RegionButton =
    d3.select('#scene2-region-btn');

const scene2IncomeButton =
    d3.select('#scene2-income-btn');

// Switch to regions.
scene2RegionButton.on('click', () => {

    stopScene2Playback();

    scene2View = 'Region';

    scene2HoveredGroup = null;
    scene2SelectedGroup = null;

    scene2RegionButton.classed('active', true);
    scene2IncomeButton.classed('active', false);

    renderScene2Legend();

    renderScene2(false);
});

// Switch to income levels.
scene2IncomeButton.on('click', () => {

    stopScene2Playback();

    scene2View = 'Income';

    scene2HoveredGroup = null;
    scene2SelectedGroup = null;

    scene2IncomeButton.classed('active', true);
    scene2RegionButton.classed('active', false);

    renderScene2Legend();

    renderScene2(false);
});


// -----------------------------------------
// 13. INITIAL RENDER
// -----------------------------------------

renderScene2Legend();

renderScene2(false);
