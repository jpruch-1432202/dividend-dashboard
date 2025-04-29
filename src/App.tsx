import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./App.css";

// Define the type for your dividend data
type DividendRecord = {
  propertyName: string;
  dividendDate: Date;
  dividendPerShare: number;
};

type AcquisitionDate = {
  propertyName: string;
  escrowClose: Date;
};

// Define the type for chart data points
type ChartDataPoint = {
  date: string;
  amount: number | null;
};

function App() {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [acquisitionDates, setAcquisitionDates] = useState<AcquisitionDate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    Papa.parse("/Dividend payment data.csv", {
      download: true,
      header: true,
      complete: (results: any) => {
        console.log("Raw results from PapaParse:", results);
        const data = results.data as any[];
        setDividends(
          data
            .filter(
              (row) =>
                row["Property Name"] &&
                row["Dividend Date"] &&
                row["Dividend_per_Share amount"]
            )
            .map((row) => ({
              propertyName: row["Property Name"],
              dividendDate: new Date(row["Dividend Date"]),
              dividendPerShare: parseFloat(row["Dividend_per_Share amount"]),
            }))
        );
      },
    });
    // Load acquisition dates
    Papa.parse("/escrow close dates.csv", {
      download: true,
      header: true,
      complete: (results: any) => {
        const data = results.data as any[];
        setAcquisitionDates(
          data
            .filter((row) => row["Property Name"] && row["Escrow close"])
            .map((row) => ({
              propertyName: row["Property Name"],
              escrowClose: new Date(row["Escrow close"]),
            }))
        );
      },
    });
  }, []);

  const propertyNames = Array.from(new Set(dividends.map(d => d.propertyName))).sort();

  const filteredProperties = propertyNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePropertySelect = (property: string) => {
    setSelectedProperty(property);
    setSearchTerm(property);
    setIsDropdownOpen(false);
  };

  // Helper: Get all years and months in the data
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const years = Array.from(new Set(dividends.map(d => d.dividendDate.getFullYear()))).sort((a, b) => b - a);

  // Helper: Check if a dividend was paid for a given year/month
  function wasPaid(year: number, monthIdx: number) {
    return dividends.some(d =>
      d.propertyName === selectedProperty &&
      d.dividendDate.getFullYear() === year &&
      d.dividendDate.getMonth() === monthIdx &&
      d.dividendPerShare > 0
    );
  }

  function wasPaidOrBlank(year: number, monthIdx: number) {
    // For 2025, months April (3) to December (11) should be blank
    if (year === 2025 && monthIdx >= 3) {
      return null; // blank cell
    }
    // Hard-coded blank cells for specific year/months
    const blanks: [number, number[]][] = [
      [2021, [0,1,2,3,4,6,7,9,10]], // Jan-May, Jul-Aug, Oct-Nov 2021
      [2022, [0,1,3,4,6,7,9,10]],   // Jan-Feb, Apr-May, Jul-Aug, Oct-Nov 2022
      [2023, [0,1,3,4,6,7,9,10]],   // Jan-Feb, Apr-May, Jul-Aug, Oct-Nov 2023
    ];
    for (const [y, months] of blanks) {
      if (year === y && months.includes(monthIdx)) {
        return null;
      }
    }
    // Blank out months before acquisition date for the selected property,
    // but if a dividend is paid in the same month as acquisition, show the checkmark
    if (selectedProperty) {
      const acq = acquisitionDates.find(a => a.propertyName === selectedProperty);
      if (acq) {
        const cellDate = new Date(year, monthIdx, 1);
        // If the cell is before the acquisition month, blank
        if (
          cellDate.getFullYear() < acq.escrowClose.getFullYear() ||
          (cellDate.getFullYear() === acq.escrowClose.getFullYear() && cellDate.getMonth() < acq.escrowClose.getMonth())
        ) {
          return null;
        }
        // If the cell is the same month/year as acquisition, but a dividend is paid, show checkmark
        if (
          cellDate.getFullYear() === acq.escrowClose.getFullYear() &&
          cellDate.getMonth() === acq.escrowClose.getMonth()
        ) {
          if (wasPaid(year, monthIdx)) {
            return true;
          }
        }
      }
    }
    return wasPaid(year, monthIdx);
  }

  // Helper: Get dividend amount for a given year/month
  function getDividendAmount(year: number, monthIdx: number) {
    const dividend = dividends.find(d =>
      d.propertyName === selectedProperty &&
      d.dividendDate.getFullYear() === year &&
      d.dividendDate.getMonth() === monthIdx &&
      d.dividendPerShare > 0
    );
    return dividend ? dividend.dividendPerShare : 0;
  }

  // Process data for the line chart
  const getChartData = (): ChartDataPoint[] => {
    if (!selectedProperty) return [
      { date: 'Jan 2021', amount: null },
      { date: 'Jul 2021', amount: null },
      { date: 'Jan 2022', amount: null },
      { date: 'Jul 2022', amount: null },
      { date: 'Jan 2023', amount: null },
      { date: 'Jul 2023', amount: null },
      { date: 'Jan 2024', amount: null }
    ];
    
    const rawData = dividends
      .filter(d => d.propertyName === selectedProperty)
      .sort((a, b) => a.dividendDate.getTime() - b.dividendDate.getTime());

    const monthlyData: ChartDataPoint[] = [];
    
    rawData.forEach(dividend => {
      const date = dividend.dividendDate;
      
      // For payments before 2024, split into three monthly payments
      if (date.getFullYear() < 2024 || (date.getFullYear() === 2023 && date.getMonth() === 11)) {
        // Get the month numbers for the quarter (e.g., Dec payment covers Oct, Nov, Dec)
        const monthsInQuarter = [
          date.getMonth() - 2,
          date.getMonth() - 1,
          date.getMonth()
        ];

        // Add a data point for each month in the quarter
        monthsInQuarter.forEach(monthNum => {
          const adjustedMonth = new Date(date.getFullYear(), monthNum, 1);
          monthlyData.push({
            date: adjustedMonth.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short'
            }),
            amount: +(dividend.dividendPerShare / 3).toFixed(3) // Round to 3 decimal places
          });
        });
      } else {
        // For 2024 onwards, use the actual monthly payment
        monthlyData.push({
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
          }),
          amount: dividend.dividendPerShare
        });
      }
    });

    // Sort the data by date
    return monthlyData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Calculate dividend payment success rate
  const calculateSuccessRate = () => {
    if (!selectedProperty) return null;

    let successCount = 0;
    let totalCount = 0;

    years.forEach(year => {
      months.forEach((_, monthIdx) => {
        const paid = wasPaidOrBlank(year, monthIdx);
        // Only count non-null values (actual payment opportunities)
        if (paid !== null) {
          totalCount++;
          if (paid) successCount++;
        }
      });
    });

    return totalCount > 0 ? (successCount / totalCount) * 100 : null;
  };

  return (
    <div className="App">
      <h2>Arrived Property Dividend History</h2>
      <div className="property-selector">
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
              if (e.target.value === "") {
                setSelectedProperty("");
              }
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search or select a property"
          />
          {isDropdownOpen && filteredProperties.length > 0 && (
            <div className="property-dropdown">
              {filteredProperties.map(name => (
                <div
                  key={name}
                  className={`property-option ${name === selectedProperty ? 'selected' : ''}`}
                  onClick={() => handlePropertySelect(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Rate Display */}
      {selectedProperty && (
        <div className="success-rate">
          <p>
            The <span className="property-name">{selectedProperty}</span> has paid{' '}
            <span className="rate-value">{calculateSuccessRate()?.toFixed(1)}%</span>{' '}
            of possible dividends
          </p>
        </div>
      )}

      {/* Table grid chart */}
      <table>
        <thead>
          <tr>
            <th>Year</th>
            {months.map(m => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map(year => (
            <tr key={year}>
              <td className="year-cell">{year}</td>
              {months.map((m, idx) => {
                if (!selectedProperty) {
                  return <td key={m}></td>;
                }
                const paid = wasPaidOrBlank(year, idx);
                const dividendAmount = paid ? getDividendAmount(year, idx) : 0;
                return (
                  <td 
                    key={m}
                    {...(paid !== null ? { title: `$${dividendAmount.toFixed(2)}` } : {})}
                  >
                    {paid === null
                      ? ''
                      : paid
                        ? '✅'
                        : '❌'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Line chart */}
      <div className="chart-container">
        <h3>Monthly Dividend Payment History</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getChartData()} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={60}
              interval={2}
            />
            <YAxis 
              label={{ 
                value: 'Monthly Dividend per Share ($)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -40,
                style: { 
                  textAnchor: 'middle',
                  fontSize: '0.9rem'
                }
              }}
            />
            <Tooltip 
              formatter={(value) => value ? [`$${value}`, 'Monthly Dividend'] : ['-', 'Monthly Dividend']}
              labelStyle={{ color: 'var(--arrived-primary)' }}
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid var(--arrived-border)',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="var(--arrived-accent)" 
              strokeWidth={2}
              dot={{ fill: 'var(--arrived-accent)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="chart-note">
          Note: Prior to January 2024, dividends were paid quarterly (every 3 months). For comparison purposes, 
          these quarterly payments have been divided evenly across their respective months to match the current monthly payment structure.
        </p>
        <p className="chart-data-note">
          Data for the line chart begins with the first dividend payment.
        </p>
      </div>
    </div>
  );
}

export default App;
