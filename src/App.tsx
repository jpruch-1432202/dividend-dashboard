import React, { useEffect, useState } from "react";
import Papa from "papaparse";
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

  return (
    <div className="App">
      <h2>Property Dividend History</h2>
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
    </div>
  );
}

export default App;
