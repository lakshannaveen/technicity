import axios from 'axios';

const UsageReportService = {
  // days: number of days for daily report (e.g. 30)
  getDailyReport: (days = 30) => axios.get(`/UsageReport/GetDailyReport?Days=${encodeURIComponent(days)}`),

  // months: number of months for monthly aggregation (e.g. 6)
  getMonthlyReport: (months = 1) => axios.get(`/UsageReport/GetMonthlyReport?Months=${encodeURIComponent(months)}`),

  // custom range: ISO dates (YYYY-MM-DD)
  getCustomReport: (startDate, endDate) => axios.get(`/UsageReport/GetCustomReport?StartDate=${encodeURIComponent(startDate)}&EndDate=${encodeURIComponent(endDate)}`),
};

export default UsageReportService;
