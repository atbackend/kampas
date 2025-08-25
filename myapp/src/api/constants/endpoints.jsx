export const LOGIN_API = '/api/auth/login/';
export const REGISTER_API = '/api/auth/register/';
export const VERIFY_API = '/api/auth/verify-email/';
export const RESETPASSWORD_API ='/api/auth/reset-password/';
export const LOGOUT_API ='/api/auth/logout/';

//user//
export const CREATE_USER= '/api/auth/users/create-user/';
export const FETCH_USER= '/api/auth/users/';
export const UPDATE_USER= '/api/auth/users/update-user/<user_id>/';

//profile
export const PROFILE_API= '/api/auth/profile/';
export const FORGETPASSWORD_API ='/api/auth/forgot-password/';

//company
// export const CREATE_COMPANY= '/api/company/clients/';
export const VIEW_COMPANY ='/api/company/profile/';
export const UPDATE_COMPANY = "/api/company/profile/";
export const DETAILSVIEW_COMPANY = "/api/company/clients/<client_id>/";


//client
export const CREATE_CLIENT= '/api/company/clients/';
export const VIEW_CLIENT ='/api/company/clients/';
export const UPDATE_CLIENT = "/api/company/clients/<client_id>/";
export const DETAILSVIEW_CLIENT = "/api/company/clients/<client_id>/";


//Project 
export const CREATE_PROJECT= '/api/projects/create-project/';
export const FETCH_PROJECT ='/api/projects/';
export const UPDATE_PROJECT = "/api/projects/<project_id>/";
export const DETAILSVIEW_PROJECT = "/api/projects/<project_id>/";

//Map

//layers
export const IMAGE_UPLOAD = '/api/projects/<project_id>/file-upload/'

//Street
export const GET_STREET_IMAGE = '/api/projects/<project_id>/street-images/'
export const GET_STREET_IMAGE_BY_ID = '/api/projects/<project_id>/street-images/<image_id>'
export const GET_VECTOR_IMAGES = '/api/projects/<project_id>/vector-layers/'
export const GET_RASTER_IMAGES = '/api/projects/<project_id>/raster-layers/'