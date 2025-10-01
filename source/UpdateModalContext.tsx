import React, { createContext, useContext, useState, useEffect } from 'react';
// import UpdateModal from '../components/UpdateModal';
// import Config from '../../config'; // Adjust path to your config file
import { useSelector } from 'react-redux';
import UpdateModal from './components/UpdateModal';
import Config from 'react-native-config';

const UpdateModalContext = createContext();

export const useUpdateModal = () => useContext(UpdateModalContext);

export const UpdateModalProvider = ({ children }) => {
    const { user } = useSelector(({ user }) => user);
    const [visible, setVisible] = useState(false);
    const appVersion = user?.appVersion;

    console.log(appVersion, "THE APP VERSION")
    

  useEffect(() => {
    if (appVersion && Config.APP_VERSION && appVersion > Config.APP_VERSION) {
      setVisible(true);
    }
  }, [appVersion]);

  const handleClose = () => setVisible(false);

  return (
    <UpdateModalContext.Provider value={{ visible, setVisible }}>
      {children}
      <UpdateModal
        visible={visible}
        onClose={handleClose}
        updateUrl={Config.APK_URL}
        required={true}
      />
    </UpdateModalContext.Provider>
  );
};