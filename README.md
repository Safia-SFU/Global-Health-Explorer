# Global-Health-Explorer

Data Collection and Preparation

The data used in this project were obtained from three datasets downloaded from the World Bank (WB) online database, covering health indicators, economic indicators, and Universal Health Coverage (UHC). These datasets were cleaned, standardized, and merged using Python (pandas), with Country Name and Year as the common keys. The UHC dataset was reshaped from long to wide format to preserve both the overall UHC index and its four components.

Additional variables were created to classify countries into seven geographic regions (Region_Safia) and four income groups (Income_Safia). Separate variables (Region_WB and Income_WB) were also created to identify the regional and income-group aggregate observations provided by the World Bank. Unnecessary aggregate categories were removed, while the main regional aggregates, income-group aggregates, and global (World) observations were retained to support comparisons at different levels.
The final dataset, Data_ready_d3js.csv, contains 15,114 observations and 90 variables, including 217 countries and territories, covering the period from 1960 to 2025, with 14,322 country-year observations and 792 aggregate observations.

Data availability varies across indicators, countries, and years, meaning that not all variables have complete coverage throughout the study period. Some indicators are available only at the regional, income-group, or global aggregate level rather than for individual countries. These observations were intentionally preserved to support different types of comparisons. As a result, the interactive visualizations developed using D3.js may focus on different time periods and geographic or economic aggregation levels, depending on data availability and the specific analytical question being explored. Missing values will be considered when selecting indicators and time ranges to ensure meaningful and accurate comparisons.
