/**
 * @format
 */

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {AppRegistry, Text, TextInput, View} from 'react-native';
import {AppWrapper} from './source/AppWrapper';
import {name as appName} from './app.json';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = Text.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;
View.defaultProps = Text.defaultProps || {};
View.defaultProps.allowFontScaling = false;

AppRegistry.registerComponent(appName, () => AppWrapper);
