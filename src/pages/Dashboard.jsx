import React, { useState } from "react";
import { generateTimetable } from "../services/api";
import Timetable from "../../../../timetable-frontend/src/components/Timetable";

const Dashboard = () => {

  const [timetable, setTimetable] = useState([]);

  const handleGenerate = async () => {
    try {
      const res = await generateTimetable();
      setTimetable(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>

      <h1>AI Timetable Generator</h1>

      <button onClick={handleGenerate}>
        Generate Timetable
      </button>

      <Timetable data={timetable} />

    </div>
  );
};

export default Dashboard;