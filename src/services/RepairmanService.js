import axios from 'axios';
 
const GetAllRepairman = async () => {
    let config = {
        method: 'get',
        url: '/Repairman/GetAllRepairman',
    };
   
    return axios.request(config);
};

const GetRepairmanByID = async () => {
    let config = {
        method: 'get',
        url: '/Repairman/GetRepairmanByID',
    };
   
    return axios.request(config);
};

const AddRepairman = async (repairmanData) => {
    let config = {
        method: 'post',
        url: '/Repairman/AddRepairman',
        data: repairmanData
    };
   
    return axios.request(config);
};

const UpdateRepairman = async (data) => {
    let config = {
        method: 'put',
        url: '/Repairman/UpdateRepairman',
        data: data
    };
   
    return axios.request(config);
};

const DeleteRepairman = async () => {
    let config = {
        method: 'delete',
        url: '/Repairman/DeleteRepairman',
    };
   
    return axios.request(config);
};
const RepairmanService = {
    GetAllRepairman,
    GetRepairmanByID,
    AddRepairman,
    UpdateRepairman,
    DeleteRepairman
};

export default RepairmanService;