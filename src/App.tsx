import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./App.css";

const { FaBed, FaBath, FaRulerCombined, FaCalendarAlt, FaHammer } = require('react-icons/fa');

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

type PropertyData = {
  propertyName: string;
  fullAddress: string;
  market: string;
  ipoDate: Date;
  firstSharePriceDate: Date;
  propertyType: string;
  termLoanToCost: number;
  bedrooms: number;
  totalBathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  shareCount: number;
};

type ValuationRecord = {
  propertyName: string;
  date: Date;
  valuation: number;
};

// Add new type for completed investments
type CompletedInvestment = {
  propertyName: string;
  endingDate: Date;
  finalPayout: number;
};

// Define the type for chart data points
type ChartDataPoint = {
  date: string;
  amount: number | null;
};

type ValuationChartPoint = {
  date: string;
  value: number | null;
};

const InfoIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="info-icon-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg
        className="info-icon"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 12V7M8 5V4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {showTooltip && (
        <div className="custom-tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
};

function App() {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [displayedProperty, setDisplayedProperty] = useState<string>("");
  const [acquisitionDates, setAcquisitionDates] = useState<AcquisitionDate[]>([]);
  const [valuations, setValuations] = useState<ValuationRecord[]>([]);
  const [propertyData, setPropertyData] = useState<PropertyData[]>([]);
  const [completedInvestments, setCompletedInvestments] = useState<CompletedInvestment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAnnualizedYield, setShowAnnualizedYield] = useState(true);
  const [showAverageYield, setShowAverageYield] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside handler
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Load dividend data
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

    // Load valuations
    Papa.parse("/Arrived Valuations.csv", {
      download: true,
      header: true,
      complete: (results: any) => {
        const data = results.data as any[];
        setValuations(
          data
            .filter((row) => row["Property Name"] && row["Date"] && row["Valuation"])
            .map((row) => ({
              propertyName: row["Property Name"],
              date: new Date(row["Date"]),
              valuation: parseFloat(row["Valuation"]),
            }))
        );
      },
    });

    // Load property data
    Papa.parse("/property data.csv", {
      download: true,
      header: true,
      complete: (results: any) => {
        console.log("Property data columns:", Object.keys(results.data[0]));
        const data = results.data as any[];
        console.log("Raw Share Count data:", data.map(row => ({
          property: row["Property Name"],
          shareCount: row["Share Count"]
        })));
        setPropertyData(
          data
            .filter((row) => 
              row["Property Name"] && 
              row["Full Address"] && 
              row["Market"] && 
              row["IPO Date"] && 
              row["First Share Price Date"] &&
              row["Rental Type"] &&
              row["Term Loan to Cost"] &&
              row["Bedrooms"] &&
              row["Total Bathrooms"] &&
              row["SF"] &&
              row["Year Built"] &&
              row["Share Count"]
            )
            .map((row) => ({
              propertyName: row["Property Name"],
              fullAddress: row["Full Address"],
              market: row["Market"],
              ipoDate: new Date(row["IPO Date"]),
              firstSharePriceDate: new Date(row["First Share Price Date"]),
              propertyType: row["Rental Type"] === "Long Term" ? "Single Family Residential" : "Vacation Rental",
              termLoanToCost: parseFloat(row["Term Loan to Cost"]),
              bedrooms: parseInt(row["Bedrooms"]),
              totalBathrooms: parseFloat(row["Total Bathrooms"]),
              squareFootage: parseInt(row["SF"]),
              yearBuilt: parseInt(row["Year Built"]),
              shareCount: Number(row["Share Count"].replace(/,/g, ''))
            }))
        );
      },
    });

    // Load completed investments
    Papa.parse("/completed investments.csv", {
      download: true,
      header: true,
      complete: (results: any) => {
        const data = results.data as any[];
        setCompletedInvestments(
          data
            .filter((row) => row["Property Name"] && row["Ending Date"] && row["Final Payout"])
            .map((row) => ({
              propertyName: row["Property Name"],
              endingDate: new Date(row["Ending Date"]),
              finalPayout: parseFloat(row["Final Payout"])
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
    setDisplayedProperty(property);
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

    // Check if the date is after the investment completion date
    if (selectedProperty) {
      const endDate = getPropertyEndDate(selectedProperty);
      const cellDate = new Date(year, monthIdx, 1);
      if (cellDate > endDate) {
        return null; // blank cell for dates after completion
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

  // Helper function to get the end date for a property
  const getPropertyEndDate = (propertyName: string): Date => {
    const completedInvestment = completedInvestments.find(ci => ci.propertyName === propertyName);
    return completedInvestment ? completedInvestment.endingDate : new Date(2025, 2, 31);
  };

  // Helper function to get the final value for a property
  const getPropertyFinalValue = (propertyName: string): number => {
    const completedInvestment = completedInvestments.find(ci => ci.propertyName === propertyName);
    if (completedInvestment) {
      return completedInvestment.finalPayout;
    }
    
    // Get the most recent valuation for the property
    const propertyValuations = valuations
      .filter(v => v.propertyName === propertyName)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return propertyValuations.length > 0 ? propertyValuations[0].valuation : 10;
  };

  // Calculate all-time average yield for the selected property
  const calculateAverageYield = () => {
    if (!selectedProperty) return null;

    const propertyDividends = dividends.filter(d => d.propertyName === selectedProperty);
    const acquisitionDate = acquisitionDates.find(a => a.propertyName === selectedProperty)?.escrowClose;
    
    if (!propertyDividends.length || !acquisitionDate) return null;

    const endDate = getPropertyEndDate(selectedProperty);
    const totalDays = Math.floor((endDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Sum up all dividends
    const totalDividends = propertyDividends
      .filter(d => d.dividendDate <= endDate)
      .reduce((sum, div) => sum + div.dividendPerShare, 0);
    
    // Calculate annualized yield
    const yieldValue = ((totalDividends / totalDays) * 365 / 10 * 100);
    return Number(yieldValue.toFixed(1));
  };

  // Process data for the line chart
  const getChartData = (): ChartDataPoint[] => {
    if (!selectedProperty) {
      // Return placeholder data with null values
      return [
        { date: 'Jan 2021', amount: null },
        { date: 'Jul 2021', amount: null },
        { date: 'Jan 2022', amount: null },
        { date: 'Jul 2022', amount: null },
        { date: 'Jan 2023', amount: null },
        { date: 'Jul 2023', amount: null },
        { date: 'Jan 2024', amount: null },
        { date: 'Jul 2024', amount: null },
        { date: 'Jan 2025', amount: null }
      ];
    }

    const rawData = dividends
      .filter(d => d.propertyName === selectedProperty)
      .sort((a, b) => a.dividendDate.getTime() - b.dividendDate.getTime());

    const monthlyData: (ChartDataPoint & { averageYield?: number | null })[] = [];
    const averageYield = calculateAverageYield();
    const averageDividend = averageYield ? (averageYield / 100 * 10) / 12 : null; // Convert annual yield to monthly dividend
    
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
          const daysInMonth = new Date(date.getFullYear(), monthNum + 1, 0).getDate();
          const monthlyAmount = +(dividend.dividendPerShare / 3).toFixed(3);
          const annualizedYield = showAnnualizedYield 
            ? +((monthlyAmount / daysInMonth) * 365 / 10 * 100).toFixed(1)
            : monthlyAmount;

          monthlyData.push({
            date: adjustedMonth.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short'
            }),
            amount: annualizedYield,
            averageYield: showAverageYield ? (showAnnualizedYield ? averageYield : averageDividend) : null
          });
        });
      } else {
        // For 2024 onwards, use the actual monthly payment
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const annualizedYield = showAnnualizedYield
          ? +((dividend.dividendPerShare / daysInMonth) * 365 / 10 * 100).toFixed(1)
          : dividend.dividendPerShare;

        monthlyData.push({
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
          }),
          amount: annualizedYield,
          averageYield: showAverageYield ? (showAnnualizedYield ? averageYield : averageDividend) : null
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
  const calculateDividendStats = () => {
    if (!selectedProperty) return { 
      successRate: null, 
      paidCount: 0, 
      totalCount: 0,
      totalDividends: 0,
      grossYield: 0,
      ttmYield: 0
    };

    let paidCount = 0;
    let totalCount = 0;
    let totalDividends = 0;
    let ttmYield = 0;

    const endDate = getPropertyEndDate(selectedProperty);

    // Calculate TTM yield or annualized yield for newer properties
    if (selectedProperty) {
      const propertyDividends = dividends.filter(d => d.propertyName === selectedProperty && d.dividendDate <= endDate);
      const acquisitionDate = acquisitionDates.find(a => a.propertyName === selectedProperty)?.escrowClose;
      
      if (acquisitionDate) {
        const twelveMonthsAgo = new Date(endDate);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        const daysSinceAcquisition = Math.floor((endDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceAcquisition >= 365) {
          // Property is older than 12 months - use actual TTM
          const ttmDividends = propertyDividends
            .filter(d => d.dividendDate >= twelveMonthsAgo && d.dividendDate <= endDate)
            .reduce((sum, div) => sum + div.dividendPerShare, 0);
          const ttmYieldValue = (ttmDividends / 10 * 100);
          ttmYield = Number(ttmYieldValue.toFixed(1));
        } else {
          // Property is newer than 12 months - annualize the returns
          const totalDividendsSinceAcquisition = propertyDividends
            .reduce((sum, div) => sum + div.dividendPerShare, 0);
          const annualizedYieldValue = ((totalDividendsSinceAcquisition / daysSinceAcquisition) * 365 / 10 * 100);
          ttmYield = Number(annualizedYieldValue.toFixed(1));
        }
      }
    }

    // Calculate success rate up to the end date
    years.forEach(year => {
      months.forEach((_, monthIdx) => {
        const monthDate = new Date(year, monthIdx, 1);
        if (monthDate <= endDate) {
          const paid = wasPaidOrBlank(year, monthIdx);
          if (paid !== null) {
            totalCount++;
            if (paid) paidCount++;
          }
        }
      });
    });

    // Calculate total dividends up to the end date
    if (selectedProperty) {
      totalDividends = dividends
        .filter(d => d.propertyName === selectedProperty && d.dividendDate <= endDate)
        .reduce((sum, div) => sum + div.dividendPerShare, 0);
    }

    const grossYieldValue = (totalDividends / 10 * 100);
    const grossYield = Number(grossYieldValue.toFixed(1));
    const successRate = totalCount > 0 ? Number((paidCount / totalCount * 100).toFixed(1)) : null;

    return {
      successRate,
      paidCount,
      totalCount,
      totalDividends: Number(totalDividends.toFixed(2)),
      grossYield,
      ttmYield
    };
  };

  // Get valuation chart data
  const getValuationChartData = (): ValuationChartPoint[] => {
    if (!selectedProperty) {
      // Return placeholder data with null values
      return [
        { date: 'Jan 2021', value: null },
        { date: 'Jan 2022', value: null },
        { date: 'Jan 2023', value: null },
        { date: 'Jan 2024', value: null },
        { date: 'Jan 2025', value: null }
      ];
    }

    const property = propertyData.find(p => p.propertyName === selectedProperty);
    if (!property) return [];

    // Filter out any $10 valuations that occur before the first non-$10 valuation
    const propertyValuations = valuations
      .filter(v => v.propertyName === selectedProperty)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Find the first non-$10 valuation
    const firstNonTenIndex = propertyValuations.findIndex(v => Math.abs(v.valuation - 10) > 0.001);
    
    // If we never find a non-$10 valuation, just show IPO point
    if (firstNonTenIndex === -1) {
      return [{
        date: property.ipoDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        }),
        value: 10
      }];
    }

    // Keep only valuations from IPO to latest, but skip $10 valuations before the first non-$10 valuation
    const filteredValuations = [
      ...propertyValuations.slice(firstNonTenIndex)
    ];

    const chartData: ValuationChartPoint[] = [];

    // Generate all dates from IPO to latest valuation at 3-month intervals
    const startDate = new Date(property.ipoDate);
    const endDate = filteredValuations.length > 0 
      ? new Date(filteredValuations[filteredValuations.length - 1].date)
      : new Date();

    // Function to format date consistently
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });

    // Add IPO point
    chartData.push({
      date: formatDate(startDate),
      value: 10
    });

    // Generate quarterly points
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + 3);

    while (currentDate <= endDate) {
      // Find if there's a valuation for this date
      const valuation = filteredValuations.find(v => {
        const vDate = new Date(v.date);
        // Check if this valuation is within this quarter
        return Math.abs(vDate.getTime() - currentDate.getTime()) < 45 * 24 * 60 * 60 * 1000; // 45 days threshold
      });

      // If there's a valuation for this quarter, add it
      if (valuation) {
        chartData.push({
          date: formatDate(valuation.date),
          value: valuation.valuation
        });
      } else {
        // For dates between IPO and first valuation, add null
        const firstValuation = filteredValuations[0];
        if (currentDate < firstValuation.date) {
          chartData.push({
            date: formatDate(currentDate),
            value: null
          });
        } else {
          // Find the surrounding valuations
          const prevValuation = [...filteredValuations].reverse().find(v => v.date <= currentDate);
          if (prevValuation) {
            chartData.push({
              date: formatDate(currentDate),
              value: prevValuation.valuation
            });
          }
        }
      }

      currentDate.setMonth(currentDate.getMonth() + 3);
    }

    return chartData;
  };

  // Calculate valuation metrics
  const calculateValuationMetrics = () => {
    if (!selectedProperty) return {
      currentValuation: null,
      appreciationPerShare: null,
      appreciationPercent: null,
      totalGrossReturn: null
    };

    const finalValue = getPropertyFinalValue(selectedProperty);
    const appreciationPerShare = finalValue - 10;
    const appreciationPercent = (appreciationPerShare / 10) * 100;
    const totalGrossReturn = ((appreciationPerShare + calculateDividendStats().totalDividends) / 10) * 100;

    return {
      currentValuation: finalValue,
      appreciationPerShare,
      appreciationPercent,
      totalGrossReturn
    };
  };

  // Calculate current yield based on TTM dividends and current valuation
  const calculateCurrentYield = () => {
    if (!selectedProperty) return null;

    const ttmYield = calculateDividendStats().ttmYield;
    const currentValuation = calculateValuationMetrics().currentValuation;

    if (!currentValuation) return null;

    // Convert TTM yield (which is based on $10) to actual TTM dividends
    const ttmDividends = (ttmYield / 100) * 10;
    // Calculate new yield based on current valuation
    return (ttmDividends / currentValuation) * 100;
  };

  // Calculate Average Annual Return
  const calculateAverageAnnualReturn = () => {
    if (!selectedProperty) return null;

    const acquisitionDate = acquisitionDates.find(a => a.propertyName === selectedProperty)?.escrowClose;
    if (!acquisitionDate) return null;

    const endDate = getPropertyEndDate(selectedProperty);
    const totalDays = Math.floor((endDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalGrossReturn = calculateValuationMetrics().totalGrossReturn;
    
    if (totalGrossReturn === null) return null;

    const annualizedReturn = (totalGrossReturn / totalDays) * 365;
    return Number(annualizedReturn.toFixed(1));
  };

  // Helper function to calculate NPV given a rate
  function calculateNPV(cashFlows: { amount: number; date: Date }[], rate: number): number {
    return cashFlows.reduce((npv, cf) => {
      const yearFraction = (cf.date.getTime() - cashFlows[0].date.getTime()) / (365 * 24 * 60 * 60 * 1000);
      return npv + cf.amount / Math.pow(1 + rate, yearFraction);
    }, 0);
  }

  // Calculate IRR using Newton-Raphson method
  function calculateIRR(cashFlows: { amount: number; date: Date }[]): number | null {
    if (cashFlows.length < 2) return null;

    let rate = 0.1; // Initial guess
    const maxIterations = 100;
    const tolerance = 0.0000001;

    for (let i = 0; i < maxIterations; i++) {
      const npv = calculateNPV(cashFlows, rate);
      if (Math.abs(npv) < tolerance) {
        return rate;
      }

      // Calculate derivative of NPV with respect to rate
      const derivative = cashFlows.reduce((sum, cf) => {
        const yearFraction = (cf.date.getTime() - cashFlows[0].date.getTime()) / (365 * 24 * 60 * 60 * 1000);
        return sum - yearFraction * cf.amount / Math.pow(1 + rate, yearFraction + 1);
      }, 0);

      // Newton-Raphson step
      const newRate = rate - npv / derivative;
      
      // Check for convergence
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate;
      }

      rate = newRate;
    }

    return null; // Failed to converge
  }

  // Calculate IRR for a property
  const calculatePropertyIRR = () => {
    if (!selectedProperty) return null;

    const propertyDividends = dividends.filter(d => d.propertyName === selectedProperty);
    const acquisitionDate = acquisitionDates.find(a => a.propertyName === selectedProperty)?.escrowClose;
    const endDate = getPropertyEndDate(selectedProperty);
    const finalValue = getPropertyFinalValue(selectedProperty);
    
    if (!acquisitionDate) return null;

    // Create array of cash flows
    const cashFlows: { amount: number; date: Date }[] = [
      // Initial investment
      { amount: -10, date: acquisitionDate }
    ];

    // Add all dividends up to the end date
    propertyDividends.forEach(div => {
      if (div.dividendDate <= endDate) {
        cashFlows.push({
          amount: div.dividendPerShare,
          date: div.dividendDate
        });
      }
    });

    // Add final value
    cashFlows.push({
      amount: finalValue,
      date: endDate
    });

    const irr = calculateIRR(cashFlows);
    return irr ? (irr * 100) : null;
  };

  return (
    <div className="App">
      <h2>Arrived Property Historical Information</h2>
      <div className="property-selector">
        <div className="search-container" ref={searchContainerRef}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
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
        <div className="data-update-date">
          Data on this page is up to date as of 3/31/25
        </div>
      </div>

      {/* Completed Investment Alert */}
      {displayedProperty && completedInvestments.some(ci => ci.propertyName === displayedProperty) && (
        <div className="completed-investment-alert">
          <div className="alert-content">
            <span className="alert-icon">ℹ️</span>
            <span className="alert-text">
              This is an investment that was fully completed as of{' '}
              {completedInvestments.find(ci => ci.propertyName === displayedProperty)?.endingDate.toLocaleDateString('en-US', { 
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      )}

      {/* Property Summary Section */}
      <div className="property-summary-section">
        <h3>Property Summary</h3>
        <div className="property-metrics">
          <div className="property-metric">
            <FaBed className="property-metric-icon" />
            <div className="property-metric-value">
              {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.bedrooms : "—"}
            </div>
          </div>
          <div className="property-metric">
            <FaBath className="property-metric-icon" />
            <div className="property-metric-value">
              {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.totalBathrooms : "—"}
            </div>
          </div>
          <div className="property-metric">
            <FaRulerCombined className="property-metric-icon" />
            <div className="property-metric-value">
              {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.squareFootage.toLocaleString() : "—"}
              <span className="property-metric-unit">sqft</span>
            </div>
          </div>
          <div className="property-metric">
            <FaHammer className="property-metric-icon" />
            <div className="property-metric-value">
              {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.yearBuilt : "—"}
            </div>
          </div>
        </div>
        <div className="property-summary-grid">
          <div className="property-summary-left">
            <div className="property-detail">
              <span className="property-label">Full Address:</span>
              <span className="property-value">{displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.fullAddress : "—"}</span>
            </div>
            <div className="property-detail">
              <span className="property-label">Market:</span>
              <span className="property-value">{displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.market : "—"}</span>
            </div>
            <div className="property-detail">
              <span className="property-label">Property Type:</span>
              <span className="property-value">{displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.propertyType : "—"}</span>
            </div>
            <div className="property-detail">
              <span className="property-label">
                Property Leverage
                <InfoIcon 
                  tooltip="This is the loan to value ratio based on the original purchase price"
                />
              </span>
              <span className="property-value">
                {displayedProperty ? 
                  `${Math.round(propertyData.find(p => p.propertyName === displayedProperty)?.termLoanToCost || 0)}%` 
                  : "—"}
              </span>
            </div>
          </div>
          <div className="property-summary-right">
            <div className="property-detail">
              <span className="property-label">IPO Date:</span>
              <span className="property-value">
                {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.ipoDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "—"}
              </span>
            </div>
            <div className="property-detail">
              <span className="property-label">Time Since IPO:</span>
              <span className="property-value">
                {displayedProperty ? (() => {
                  const property = propertyData.find(p => p.propertyName === displayedProperty);
                  if (!property) return "—";
                  const endDate = getPropertyEndDate(displayedProperty);
                  const days = Math.floor((endDate.getTime() - property.ipoDate.getTime()) / (1000 * 60 * 60 * 24));
                  return `${(days / 365).toFixed(1)} years`;
                })() : "—"}
              </span>
            </div>
            <div className="property-detail">
              <span className="property-label">Number of Shares:</span>
              <span className="property-value">
                {displayedProperty ? propertyData.find(p => p.propertyName === displayedProperty)?.shareCount.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="returns-summary">
        <h3>Returns Summary</h3>
        <div className="returns-sections">
          <div className="returns-section total-returns">
            <h4>Total Returns</h4>
            <div className="returns-metrics-container">
              <div className="returns-metric highlight">
                <span className="returns-metric-value">
                  {displayedProperty ? `${calculateValuationMetrics().totalGrossReturn?.toFixed(1)}%` : "—"}
                </span>
                <span className="returns-metric-label">
                  Total Gross Return
                </span>
              </div>
              <div className="returns-metric highlight">
                <span className="returns-metric-value">
                  {displayedProperty ? (() => {
                    const value = calculateDividendStats().totalDividends + (calculateValuationMetrics().appreciationPerShare || 0);
                    return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`;
                  })() : "—"}
                </span>
                <span className="returns-metric-label">
                  Total Gross Return Per Share
                </span>
              </div>
              <div className="returns-metric highlight">
                <span className="returns-metric-value">
                  {displayedProperty ? `${calculateAverageAnnualReturn()?.toFixed(1)}%` : "—"}
                </span>
                <span className="returns-metric-label">
                  Average Annual Return
                </span>
              </div>
              <div className="returns-metric highlight">
                <span className="returns-metric-value">
                  {displayedProperty ? (() => {
                    const irr = calculatePropertyIRR();
                    return irr ? `${irr.toFixed(1)}%` : 'N/A';
                  })() : "—"}
                </span>
                <span className="returns-metric-label">
                  Internal Rate of Return (IRR)
                  <InfoIcon 
                    tooltip="IRR represents the annualized return rate that makes the present value of all cash flows equal to zero. It considers the $10 initial investment, all dividend payments, and the final property valuation as of March 31, 2025."
                  />
                </span>
              </div>
            </div>
          </div>

          <div className="returns-section dividends">
            <h4>Dividends</h4>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? calculateDividendStats().paidCount : "—"}
              </span>
              <span className="returns-metric-label">
                Dividends Paid {displayedProperty ? `(${calculateDividendStats().successRate?.toFixed(1)}% of possible dividends)` : ""}
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? `${calculateAverageYield()?.toFixed(1)}%` : "—"}
              </span>
              <span className="returns-metric-label">
                All-Time Average Dividend Yield (Based on $10/share cost)
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? `${calculateDividendStats().ttmYield.toFixed(1)}%` : "—"}
              </span>
              <span className="returns-metric-label">
                Trailing 12-Month Dividend Yield (Based on $10/share cost)
                {displayedProperty && acquisitionDates.find(a => a.propertyName === displayedProperty)?.escrowClose &&
                 (new Date().getTime() - acquisitionDates.find(a => a.propertyName === displayedProperty)!.escrowClose.getTime()) / (1000 * 60 * 60 * 24) < 365 
                  ? ' (Annualized)' 
                  : ''}
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? `${calculateCurrentYield()?.toFixed(1)}%` : "—"}
              </span>
              <span className="returns-metric-label">
                Current Yield (TTM Dividends / Current Valuation)
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? `$${calculateDividendStats().totalDividends.toFixed(2)}` : "—"}
              </span>
              <span className="returns-metric-label">
                All-Time Dividends Per Share
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? `${calculateDividendStats().grossYield.toFixed(1)}%` : "—"}
              </span>
              <span className="returns-metric-label">
                Gross Dividend Yield (Total Dividends / $10)
              </span>
            </div>
          </div>

          <div className="returns-section appreciation">
            <h4>Appreciation</h4>
            {displayedProperty && valuations.filter(v => v.propertyName === displayedProperty).length === 0 && (
              <div className="returns-metric">
                <span className="returns-metric-value">
                  {propertyData.find(p => p.propertyName === displayedProperty)?.firstSharePriceDate.toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                <span className="returns-metric-label">
                  First Arrived Valuation Date
                </span>
              </div>
            )}
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? (
                  valuations.filter(v => v.propertyName === displayedProperty).length === 0
                    ? "N/A"
                    : (() => {
                        const value = calculateValuationMetrics().currentValuation;
                        return value !== null && value < 0 
                          ? `-$${Math.abs(value).toFixed(2)}`
                          : `$${value?.toFixed(2)}`;
                      })()
                ) : "—"}
              </span>
              <span className="returns-metric-label">
                Current Arrived Valuation
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? (
                  valuations.filter(v => v.propertyName === displayedProperty).length === 0
                    ? "N/A"
                    : (() => {
                        const value = calculateValuationMetrics().appreciationPerShare;
                        return value !== null && value < 0
                          ? `-$${Math.abs(value).toFixed(2)}`
                          : `$${value?.toFixed(2)}`;
                      })()
                ) : "—"}
              </span>
              <span className="returns-metric-label">
                Appreciation Per Share
              </span>
            </div>
            <div className="returns-metric">
              <span className="returns-metric-value">
                {displayedProperty ? (
                  valuations.filter(v => v.propertyName === displayedProperty).length === 0
                    ? "N/A"
                    : `${calculateValuationMetrics().appreciationPercent?.toFixed(1)}%`
                ) : "—"}
              </span>
              <span className="returns-metric-label">
                Appreciation Per Share %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate Display - only show when property is selected */}
      {displayedProperty && (
        <div className="success-rate">
          <p>
            The <span className="property-name">{displayedProperty}</span> has paid{' '}
            <span className="rate-value">{calculateDividendStats().successRate}%</span>{' '}
            of possible dividends
          </p>
        </div>
      )}

      {/* Table grid chart - show empty structure when no property selected */}
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
                if (!displayedProperty) {
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

      {/* Charts - always show */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Dividend Payment History</h3>
          <div className="chart-controls">
            <div className="chart-toggle">
              <div 
                className={`toggle-switch ${showAnnualizedYield ? 'checked' : ''}`}
                onClick={() => setShowAnnualizedYield(!showAnnualizedYield)}
              >
                <div className="toggle-slider"></div>
                <div className="toggle-icons">
                  <span>$</span>
                  <span>%</span>
                </div>
              </div>
            </div>
            <label className="average-yield-toggle">
              <input
                type="checkbox"
                checked={showAverageYield}
                onChange={(e) => setShowAverageYield(e.target.checked)}
              />
              <span>Show All-Time Average {showAnnualizedYield ? 'Yield' : 'Dividend'}</span>
            </label>
          </div>
        </div>
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
                value: showAnnualizedYield ? 'Annualized Dividend Yield (%)' : 'Monthly Dividend per Share ($)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -40,
                style: { 
                  textAnchor: 'middle',
                  fontSize: '0.9rem'
                }
              }}
              tickFormatter={(value) => showAnnualizedYield ? `${value}%` : `$${value}`}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'averageYield') {
                  return value ? [
                    showAnnualizedYield ? `${value}%` : `$${Number(value).toFixed(3)}`,
                    `All-Time Average ${showAnnualizedYield ? 'Yield' : 'Dividend'}`
                  ] : [`${showAnnualizedYield ? '0%' : '$0.000'}`, `All-Time Average ${showAnnualizedYield ? 'Yield' : 'Dividend'}`];
                }
                return value ? [
                  showAnnualizedYield ? `${value}%` : `$${value}`, 
                  showAnnualizedYield ? 'Annualized Yield' : 'Dividend'
                ] : [`${showAnnualizedYield ? '0%' : '$0.000'}`, showAnnualizedYield ? 'Annualized Yield' : 'Dividend'];
              }}
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
            {showAverageYield && (
              <Line 
                type="monotone" 
                dataKey="averageYield" 
                stroke="#FF6B6B"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <p className="chart-note">
          Note: Prior to January 2024, dividends were paid quarterly (every 3 months). For comparison purposes, 
          these quarterly payments have been divided evenly across their respective months to match the current monthly payment structure.
        </p>
        <p className="chart-data-note">
          Data for the line chart begins with the first dividend payment.
        </p>
        <p className="chart-data-note">
          Annualized Yield is calculated by taking that month's dividend and extrapolating for a full year. It's based off a $10 per share purchase price. 
        </p>
      </div>

      <div className="chart-container">
        <h3>Arrived Valuation History</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getValuationChartData()} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
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
                value: 'Arrived Valuation ($)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -40,
                style: { 
                  textAnchor: 'middle',
                  fontSize: '0.9rem'
                }
              }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value) => [`$${value}`, 'Arrived Valuation']}
              labelStyle={{ color: 'var(--arrived-primary)' }}
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid var(--arrived-border)',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="linear" 
              dataKey="value" 
              stroke="var(--arrived-accent)" 
              strokeWidth={2}
              dot={{ fill: 'var(--arrived-accent)' }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="chart-note">
          Share value starts at $10 (IPO price) and updates based on Arrived's periodic valuations.
        </p>
      </div>

      {/* Disclaimer Section - always show */}
      <div className="disclaimer-section">
        <h4>Disclaimer</h4>
        <p>
          This dashboard is for informational purposes only. While we strive for accuracy, the data presented may not be 100% accurate 
          and should not be relied upon for investment decisions. All return calculations use the Initial Escrow Close date as the 
          investment starting point, which may differ from your actual investment date. All data shown is as of March 31, 2025. Please verify all information independently 
          and consult with financial advisors for investment decisions.
        </p>
      </div>
    </div>
  );
}

export default App;
