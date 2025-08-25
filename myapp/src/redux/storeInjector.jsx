// storeInjector.js
let reduxStore;

export const setStore = (store) => {
  reduxStore = store;
};

export const getStore = () => reduxStore;