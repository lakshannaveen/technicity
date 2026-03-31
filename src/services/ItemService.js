import axios from 'axios';
 
const GetAllItems = async () => {
    let config = {
        method: 'get',
        url: '/Item/GetAllItems',
    };
   
    return axios.request(config);
};

const GetItemByID = async () => {
    let config = {
        method: 'get',
        url: '/Item/GetItemByID',
    };
   
    return axios.request(config);
};

const AddItem = async () => {
    let config = {
        method: 'post',
        url: '/Item/AddItem',
    };
   
    return axios.request(config);
};

const UpdateItem = async () => {
    let config = {
        method: 'put',
        url: '/Item/UpdateItem',
    };
   
    return axios.request(config);
};

const DeleteItem = async () => {
    let config = {
        method: 'delete',
        url: '/Item/DeleteItem',
    };
   
    return axios.request(config);
};
const ItemService = {
    GetAllItems,
    GetItemByID,
    AddItem,
    UpdateItem,
    DeleteItem
};

export default ItemService;