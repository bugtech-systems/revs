import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import ImageViewer from 'react-native-image-zoom-viewer';



export default function ViewImage({route, navigation}) {
	const { uri, title } = route.params;
	const [open, setOpen] = useState(true);

  return (
	<SafeAreaProvider style={{flexGrow: 1}}>
{/*   <View style={styles.header}>
  <TouchableOpacity
  style={{padding: 5}}
      onPress={() => navigation.goBack()}
  >
          <Icon
        //   style={styles.icon}
          size={20}
          name="arrow-back"
        />
        </TouchableOpacity>
  <Text style={{marginLeft: 10, marginRight: 10, fontWeight: 'bold'}}>{title}</Text>
  </View> */}
  <View style={{height: '100%', justifyContent: 'flex-start', alignItems: 'center', width: '100%'}}>
  <Modal visible={false} transparent={true} >
  <ImageViewer 
  renderHeader={() => <View><Text>awdaw</Text></View>}
  enableSwipeDown={true}
  onSwipeDown={() => navigation.goBack()}
  imageUrls={[{
    // Simplest usage.
    url: uri,
 
    // width: number
    // height: number
    // Optional, if you know the image size, you can set the optimization performance
 
    // You can pass props to <Image />.
    props: {
        // headers: ...
    }
}]}/>
</Modal>

 
  </View>
  </SafeAreaProvider>
  
  
  
  
  )
}


const styles = StyleSheet.create({
    container: {
      // height: '15%', // Adjust height as needed
          // flexGrow: 1,
          // height: '10%',
          alignItems: 'center',
          justifyContent: 'center'
          // borderWidth: 1
    },
    icon: {
    //   color: COLORS.black900
    },    
    header: {
      width: '100%',
      height: 50,
      paddingHorizontal: 10,
    //   elevation: 2, 
      display: 'flex',
      flexDirection: 'row',
    //   backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'flex-start'
    },    
    errorField: {
      borderColor: 'red',
      color: 'red'
    },
    tabContainer: {
      // alignItems: 'flex-start',
      // flex: 1,
      justifyContent: 'space-around',
      width: '100%',
      borderWidth: 1,
      elevation: 4,
    },
    tab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
       ewaidth: 2,
      alignItems: 'center',
      width: '100%',
      borderBottomColor: 'transparent',
      // backgroundColor: 'red'
      
      
    },
    selectedTab: {
      borderBottomColor: 'blue', // Change color as needed
    },
    tabText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    row: {
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
    },
    item: {
      flex: 1,
      padding: 10,
      borderWidth: .5,
      borderColor: '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });