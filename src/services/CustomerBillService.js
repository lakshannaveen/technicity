import axios from 'axios';

const GetTodayBillCount = async () => {
  const config = {
    method: 'get',
    url: '/CustomerBill/GetTodayBillCount',
  };
  return axios.request(config);
};

const GetBillByDate = async (billDate) => {
  const config = {
    method: 'get',
    url: `/CustomerBill/GetBillByDate?BillDate=${encodeURIComponent(billDate)}`,
  };
  return axios.request(config);
};

const GetMonthlyBillCount = async (month, year) => {
  const config = {
    method: 'get',
    url: `/CustomerBill/GetMonthlyBillCount?Month=${encodeURIComponent(month)}&Year=${encodeURIComponent(year)}`,
  };
  return axios.request(config);
};

const GetYearlyBillCount = async (year) => {
  const config = {
    method: 'get',
    url: `/CustomerBill/GetYearlyBillCount?Year=${encodeURIComponent(year)}`,
  };
  return axios.request(config);
};

const CustomerBillService = {
  GetTodayBillCount,
  GetBillByDate,
  GetMonthlyBillCount,
  GetYearlyBillCount,
};

export default CustomerBillService;
