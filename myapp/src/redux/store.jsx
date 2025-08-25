import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../redux/authSlice';
import usersReducer from '../redux+page/user/userSlice';
import clientReducer from '../redux+page/client/ClientSlice';
import projectReducer from '../redux+page/Project/ProjectSlice';
import companyReducer from '../redux+page/company/CompanySlice';
import imageUploadSlice  from '../mapviewer/ImageUploadSlice';
import workspacesReducer from './workspacesSlice';
import themeReducer from '../redux/themeSlice';
import mapReducer from '../mapviewer/MapSlice';
import streetReducer from '../mapviewer/streetSlice';

import { setStore } from "./storeInjector";

// 1️⃣ Combine all reducers
const rootReducer = combineReducers({
   auth: authReducer,
  users: usersReducer,
  projects: projectReducer,
  clients: clientReducer,
  company: companyReducer,
  workspaces: workspacesReducer,
  theme: themeReducer,
  imageUpload: imageUploadSlice, // ✅ Already in your code
  map: mapReducer,
  street: streetReducer,  
});

// 2️⃣ Create store with middleware settings
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: [
          'street/uploadStreetImages/pending',
          'street/uploadStreetImages/fulfilled',
          'street/uploadStreetImages/rejected',
          'map/setMapInstance'
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.onProgress','payload.mapInstance'],
        // Ignore these paths in the state
        ignoredPaths: ['street.uploadProgress.currentFile','map.mapInstance'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});



// 3️⃣ Inject store for external access
setStore(store);


export default store;