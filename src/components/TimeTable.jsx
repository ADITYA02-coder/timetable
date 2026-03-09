import { useState } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";

// Assign a color for each subject
const subjectColors = {
  "Mathematics": "bg-yellow-200",
  "Science": "bg-green-200",
  "Social Science": "bg-red-200",
  "English": "bg-blue-200",
  "Hindi": "bg-pink-200",
  // "History": "bg-purple-200",
  // "Computer": "bg-indigo-200",
  // Add more subjects here
};

function TimeTable() {
  const [data, setData] = useState([]);

  const downloadPDF = () => {
    const element = document.getElementById("timetable");
    html2pdf().from(element).save("timetable.pdf");
  };

  const generateTimetable = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/generate/");
      setData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday","Saturday"];
  const periods = ["9:00-10:00", "10:00-11:00", "11:00-12:00","1:00-2:00", "2:00-3:00", "3:00-4:00"];

  // Build grid: {day}{time} -> cell
  const grid = {};
  data.forEach(item => {
    if (!grid[item.day]) grid[item.day] = {};
    grid[item.day][item.time] = item;
  });

  // Helper to check consecutive periods for merging
  const getColSpan = (day, startIndex) => {
    const startPeriod = periods[startIndex];
    const startCell = grid[day]?.[startPeriod];
    if (!startCell) return 1;

    let span = 1;
    for (let i = startIndex + 1; i < periods.length; i++) {
      const nextCell = grid[day]?.[periods[i]];
      if (!nextCell) break;
      if (
        nextCell.subject === startCell.subject &&
        nextCell.teacher === startCell.teacher &&
        nextCell.room === startCell.room
      ) {
        span++;
      } else {
        break;
      }
    }
    return span;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">AI Timetable Generator</h1>
        <p className="text-gray-500 mt-2">Professional School/College style timetable</p>
      </div>

      <div className="flex justify-center gap-4 mb-8 flex-wrap">
        <button
          onClick={generateTimetable}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Generate Timetable
        </button>
        <button
          onClick={downloadPDF}
          className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 transition"
        >
          Download PDF
        </button>
      </div>

      <div id="timetable" className="overflow-x-auto shadow-lg rounded-lg bg-white">
        <table className="table-auto border-collapse w-full text-center">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="border border-gray-300 p-3">Day / Time</th>
              {periods.map(period => (
                <th key={period} className="border border-gray-300 p-3">{period}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const rowCells = [];
              for (let i = 0; i < periods.length; i++) {
                const cell = grid[day]?.[periods[i]];
                if (cell) {
                  const span = getColSpan(day, i);
                  rowCells.push(
                    <td
                      key={periods[i]}
                      colSpan={span}
                      className={`border border-gray-300 p-2 min-w-30 ${subjectColors[cell.subject] || "bg-gray-100"} font-semibold`}
                    >
                      <div>{cell.subject}</div>
                      <div className="text-sm text-gray-700">{cell.teacher}</div>
                      <div className="text-xs text-gray-600">{cell.room}</div>
                    </td>
                  );
                  i += span - 1; // skip merged cells
                } else {
                  rowCells.push(
                    <td key={periods[i]} className="border border-gray-300 p-2 min-w-30 text-gray-300">
                      —
                    </td>
                  );
                }
              }
              return (
                <tr key={day} className="hover:bg-blue-50 transition">{[
                  <td key={`${day}-label`} className="border border-gray-300 p-2 font-semibold">{day}</td>,
                  ...rowCells
                ]}</tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TimeTable;