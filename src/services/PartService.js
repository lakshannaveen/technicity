import axios from 'axios';
 
const GetAllParts = async () => {
    let config = {
        method: 'get',
        url: '/Part/GetAllParts',
    };
   
    return axios.request(config);
};

const GetPartByID = async () => {
    let config = {
        method: 'get',
        url: '/Part/GetPartByID',
    };
   
    return axios.request(config);
};

const AddPart = async () => {
    let config = {
        method: 'post',
        url: '/Part/AddPart',
    };
   
    return axios.request(config);
};

const UpdatePart = async () => {
    let config = {
        method: 'put',
        url: '/Part/UpdatePart',
    };
   
    return axios.request(config);
};

const DeletePart = async () => {
    let config = {
        method: 'delete',
        url: '/Part/DeletePart',
    };
   
    return axios.request(config);
};
const PartService = {
    GetAllParts,
    GetPartByID,
    AddPart,
    UpdatePart,
    DeletePart
};

export default PartService;