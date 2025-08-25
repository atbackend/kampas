import { VERIFY_API, REGISTER_API, FORGETPASSWORD_API, RESETPASSWORD_API } from "../constants/endpoints";
import http from "../utils/https";





export const registerUser = (data) =>
  http.post(REGISTER_API, data);


export const verifyUser = (data) =>
  http.post(VERIFY_API, data);



export const ForgotPassword = (data) =>
  http.post(FORGETPASSWORD_API, data);

export const ResetPassword = (data) =>
  http.post(RESETPASSWORD_API,data);
