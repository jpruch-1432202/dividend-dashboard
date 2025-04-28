import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import "./App.css";

// Define the type for your dividend data
type DividendRecord = {
  propertyName: string;
  dividendDate: Date;
  dividendPerShare: number;
};

function App() {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

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
  }, []);

  const propertyNames = Array.from(new Set(dividends.map(d => d.propertyName)));

  return (
    <div className="App">
      <h2>Loaded Dividend Data</h2>
      <select
        value={selectedProperty}
        onChange={e => setSelectedProperty(e.target.value)}
      >
        <option value="">Select a property</option>
        {propertyNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
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
