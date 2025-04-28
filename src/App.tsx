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

  useEffect(() => {
    Papa.parse("/Dividend payment data.csv", {
      download: true,
      header: true,
      complete: (results: Papa.ParseResult<any>) => {
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
      complete: (results: Papa.ParseResult<any>) => {
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

  const propertyNames = Array.from(new Set(dividends.map(d => d.propertyName)));

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

  return (
    <div className="App">
      <h2>Arrived Property Dividend History</h2>
      <select
        value={selectedProperty}
        onChange={e => setSelectedProperty(e.target.value)}
      >
        <option value="">Select a property</option>
        {propertyNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      {/* Table grid chart */}
      {selectedProperty && (
        <table style={{ margin: '20px auto', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '4px' }}>Year</th>
              {months.map(m => (
                <th key={m} style={{ border: '1px solid #ccc', padding: '4px' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map(year => (
              <tr key={year}>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>{year}</td>
                {months.map((m, idx) => (
                  <td key={m} style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                    {wasPaidOrBlank(year, idx) === null
                      ? ''
                      : wasPaidOrBlank(year, idx)
                        ? '✅'
                        : '❌'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Old list for reference (optional, can remove) */}
      <ul>
        {dividends
          .filter(d => !selectedProperty || d.propertyName === selectedProperty)
          .map((d, i) => (
            <li key={i}>
              {d.propertyName} | {d.dividendDate.toLocaleDateString()} | {d.dividendPerShare}
            </li>
          ))}
      </ul>
    </div>
  );
}

export default App;
