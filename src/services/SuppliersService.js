import axios from 'axios';
 
const GetAllSupplier = async () => {
    let config = {
        method: 'get',
        url: '/Supplier/GetAllSupplier',
    };
   
    return axios.request(config);
};

 
const GetSupplierbyId = async () => {
    let config = {
        method: 'get',
        url: '/Supplier/GetSupplierbyId',
    };
   
    return axios.request(config);
};

const AddSupplier = async () => {
    let config = {
        method: 'post',
        url: '/Supplier/AddSupplier',
    };
   
    return axios.request(config);
};

const UpdateSupplier = async () => {
    let config = {
        method: 'put',
        url: '/Supplier/UpdateSupplier',
    };
   
    return axios.request(config);
};

const DeleteSupplier = async () => {
    let config = {
        method: 'delete',
        url: '/Supplier/DeleteSupplier',
    };
   
    return axios.request(config);
};
 
const SuppliersService = {
    GetAllSupplier,
    GetSupplierbyId,
    AddSupplier,
    UpdateSupplier,
    DeleteSupplier
};

export default SuppliersService;