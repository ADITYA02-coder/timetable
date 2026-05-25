import axios from "axios";

const API = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL || "/api/",
  baseURL: "https://timetable-backend-phur.onrender.com/api/",
});

export const generateTimetable = async (payload) => {
  const response = await API.post("generate/", payload);
  return response.data;
};
