import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(null); // null=not decided, true/false

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      const storedPermission = await AsyncStorage.getItem('hasPermission');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      if (storedPermission !== null) {
        setHasPermission(storedPermission === 'true');
      }
    } catch (e) {
      console.log('Error loading stored data', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token, user } = res.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    return user;
  };

  const register = async (name, age, email, password) => {
    const res = await authAPI.register(name, age, email, password);
    const { token, user } = res.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const setPermissionGranted = async (granted) => {
    await AsyncStorage.setItem('hasPermission', granted ? 'true' : 'false');
    setHasPermission(granted);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, hasPermission, login, register, logout, setPermissionGranted }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);