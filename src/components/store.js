// store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers'; // upewnij się, że rootReducer jest poprawnie zaimportowany

const store = configureStore({
    reducer: rootReducer,
});

export default store;
