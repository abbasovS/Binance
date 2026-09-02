import { createContext, useContext } from 'react';

export const AuthReadyContext = createContext(false);

export const useAuthReady = () => useContext(AuthReadyContext);