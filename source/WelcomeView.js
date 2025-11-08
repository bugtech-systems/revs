import React, { useCallback, useState, useEffect, useContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Image } from 'react-native';
import { Input } from '@rneui/base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { COLORS, icons } from './constants';
// import { SessionContext } from './context/SessionContext';
import { useDispatch } from 'react-redux';
import { signIn } from './redux/actions/user.actions';

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'User ID is required' };
  }
  
  // Remove any accidental @collector.com if user typed it
  const cleanEmail = email.replace('@collector.com', '').trim();
  
  if (cleanEmail.length === 0) {
    return { isValid: false, message: 'User ID cannot be empty' };
  }
  
  if (cleanEmail.length < 3) {
    return { isValid: false, message: 'User ID must be at least 3 characters' };
  }
  
  if (cleanEmail.length > 50) {
    return { isValid: false, message: 'User ID must be less than 50 characters' };
  }
  
  // Check for invalid characters
  const invalidChars = /[^a-zA-Z0-9._-]/;
  if (invalidChars.test(cleanEmail)) {
    return { isValid: false, message: 'User ID can only contain letters, numbers, dots, hyphens, and underscores' };
  }
  
  return { isValid: true, message: '' };
};

const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  
  if (password.length > 100) {
    return { isValid: false, message: 'Password is too long' };
  }
  
  // Check for common insecure patterns
  const commonPatterns = [
    '123456',
    'password',
    'admin',
    '000000',
    '111111'
  ];
  
  if (commonPatterns.includes(password.toLowerCase())) {
    return { isValid: false, message: 'Password is too common, please choose a stronger one' };
  }
  
  return { isValid: true, message: '' };
};

const validateForm = (email, password) => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  
  return {
    isValid: emailValidation.isValid && passwordValidation.isValid,
    errors: {
      email: emailValidation.message,
      password: passwordValidation.message
    }
  };
};

export function WelcomeView() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  // Real-time validation
  useEffect(() => {
    if (touched.email) {
      const validation = validateEmail(email);
      setErrors(prev => ({ ...prev, email: validation.message }));
    }
    
    if (touched.password) {
      const validation = validatePassword(password);
      setErrors(prev => ({ ...prev, password: validation.message }));
    }
  }, [email, password, touched]);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (!touched.email) {
      setTouched(prev => ({ ...prev, email: true }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (!touched.password) {
      setTouched(prev => ({ ...prev, password: true }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const validation = validateEmail(email);
    setErrors(prev => ({ ...prev, email: validation.message }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const validation = validatePassword(password);
    setErrors(prev => ({ ...prev, password: validation.message }));
  };

  const onPressSignIn = useCallback(async () => {
    // Mark all fields as touched to show all errors
    setTouched({ email: true, password: true });
    
    const validation = validateForm(email, password);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      
      // Show the first error in an alert
      const firstError = Object.values(validation.errors).find(error => error !== '');
      if (firstError) {
        Alert.alert('Validation Error', firstError);
      }
      return;
    }

    setLoading(true);
    try {
      const currentDateTime = moment.tz('Asia/Manila').format('DD MM YYYY hh:mm:ss');
      const existingValue = await AsyncStorage.getItem('dateTimeNumber');
      
      if (!existingValue) {
        await AsyncStorage.setItem('dateTimeNumber', currentDateTime);
        console.log('DateTime updated to:', currentDateTime);
      }

      const fullEmail = String(email).trim() + '@collector.com';
      await dispatch(signIn(fullEmail, password));
      
      Alert.alert('Success', 'Logged in successfully!');
      
      // Clear form on success
      setEmail('');
      setPassword('');
      setErrors({ email: '', password: '' });
      setTouched({ email: false, password: false });
      
    } catch (error) {
      console.log('Login error:', error);
      
      // Handle specific error types
      let errorMessage = 'Unknown error occurred';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Specific error handling for common cases
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('offline')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (errorMessage.toLowerCase().includes('invalid credentials') || errorMessage.toLowerCase().includes('auth')) {
        errorMessage = 'Invalid User ID or password. Please try again.';
      } else if (errorMessage.toLowerCase().includes('user not found')) {
        errorMessage = 'User account not found. Please check your User ID.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, dispatch]);

  // Check if form is valid for enabling submit button
  const isFormValid = validateEmail(email).isValid && validatePassword(password).isValid;

  return (
    <SafeAreaProvider>
      <View style={styles.viewWrapper}>
        <View style={styles.container}>
          <Text style={{ ...styles.subtitle, marginBottom: 20 }}>Revise App</Text>
          <View style={{ width: '100%', borderColor: COLORS.gray500, marginBottom: 30 }} />

          {/* User ID Input */}
          <View style={{ width: '100%', alignItems: 'flex-start', left: 10, marginBottom: 5 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>USER ID</Text>
          </View>
          <Input
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            autoCapitalize="none"
            value={email}
            placeholder="Enter your user ID"
            containerStyle={styles.inputContainer}
            inputContainerStyle={[
              styles.inputInnerContainer,
              errors.email && touched.email && styles.inputError
            ]}
            inputStyle={styles.inputText}
            errorMessage={touched.email ? errors.email : ''}
            errorStyle={styles.errorText}
            autoCorrect={false}
            spellCheck={false}
          />

          {/* Password Input */}
          <View style={{ width: '100%', alignItems: 'flex-start', left: 10, marginBottom: 5 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>PASSWORD</Text>
          </View>
          <Input
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            autoCapitalize="none"
            value={password}
            secureTextEntry={passwordHidden}
            placeholder="Enter your password"
            containerStyle={styles.inputContainer}
            inputContainerStyle={[
              styles.inputInnerContainer,
              errors.password && touched.password && styles.inputError
            ]}
            inputStyle={styles.inputText}
            errorMessage={touched.password ? errors.password : ''}
            errorStyle={styles.errorText}
            rightIcon={
              <TouchableOpacity onPress={() => setPasswordHidden(!passwordHidden)}>
                <Image
                  source={passwordHidden ? icons.eyeOpen : icons.eyeClose}
                  style={{ height: 20, width: 20, tintColor: COLORS.gray500 }}
                />
              </TouchableOpacity>
            }
            autoCorrect={false}
            spellCheck={false}
          />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={onPressSignIn}
              disabled={loading || !isFormValid}
              style={[
                styles.mainButton, 
                { opacity: (loading || !isFormValid) ? 0.6 : 1 }
              ]}
            >
              {loading && (
                <Image 
                  source={icons.loader} 
                  style={styles.loadingIcon} 
                />
              )}
              <Text style={[
                styles.buttonText,
                loading && styles.hiddenText
              ]}>
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </Text>
            </TouchableOpacity>
        
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  viewWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303ea0',
  },
  container: {
    backgroundColor: COLORS.white,
    padding: 20,
    top: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 16,
    width: '85%',
    minHeight: 450,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subtitle: {
    fontSize: 18,
    padding: 10,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 5,
  },
  inputInnerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
    paddingHorizontal: 10,
  },
  inputError: {
    borderBottomColor: COLORS.error,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.black,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginLeft: 5,
  },
  helperContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
   mainButton: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f29601',
    width: '100%',
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
    // Important for positioning
    position: 'relative',
  },
  
  // Option 1 & 2: For overlay loading icon
  loadingIcon: {
    height: 25,
    width: 25,
    position: 'absolute',
    alignSelf: 'center',
  },
  
  // Option 2: Perfect center with transform
  loadingIconCentered: {
    height: 25,
    width: 25,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12.5, // Half of width
    marginTop: -12.5,  // Half of height
  },
  
  // Option 3: For side-by-side loader and text
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.white,
  },
  
  hiddenText: {
    opacity: 0, // Hide text when loading
  },
});

// Add these to your constants if not already present
// COLORS.primary = '#303ea0';
// COLORS.error = '#ff3b30';
// COLORS.gray300 = '#d1d1d6';
// COLORS.gray500 = '#8e8e93';