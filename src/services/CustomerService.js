import axios from 'axios';
 
const GetAllCustomers = async () => {
    let config = {
        method: 'get',
        url: '/Customer/GetAllCustomers',
    };
   
    return axios.request(config);
};

const GetCustomerByID = async () => {
    let config = {
        method: 'get',
        url: '/Customer/GetCustomerByID',
    };
   
    return axios.request(config);
};
 
const AddCustomers = async () => {
    let config = {
        method: 'post',
        url: '/Customer/AddCustomers',
    };
   
    return axios.request(config);
};
 
const UpdateCustomers = async () => {
    let config = {
        method: 'put',
        url: '/Customer/UpdateCustomers',
    };
   
    return axios.request(config);
};
 
const DeleteCustomers = async () => {
    let config = {
        method: 'delete',
        url: '/Customer/DeleteCustomers',
    };
   
    return axios.request(config);
};
const CustomerService = {
    GetAllCustomers,
    GetCustomerByID,
    AddCustomers,
    UpdateCustomers,
    DeleteCustomers
};

export default CustomerService;
 
 