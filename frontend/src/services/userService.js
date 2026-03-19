import { userAPI } from "./api";

export const getUsers = () => userAPI.getAll();
export const createUser = (payload) => userAPI.create(payload);
export const updateUser = (id, payload) => userAPI.update(id, payload);
export const deleteUser = (id) => userAPI.remove(id);
