import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { realmContext } from '../../RealmContext';
import { Messages, Users } from '../../Models';
import { SET_ACTIVE_USER, SET_SUMMARIZED_USER } from '../../redux/actions/types';
import { COLORS, icons } from '../../constants';
import Animated, { FadeInDown } from 'react-native-reanimated';


const { useRealm, useQuery } = realmContext;

const TellersScreen = ({ navigation }) => {
  const realm = useRealm()
  const dispatch = useDispatch();
  const { collector, user, selectedUser } = useSelector(({ user }) => user)
  const [searchQuery, setSearchQuery] = useState('');
  const [usersCoord, setUsersCoord] = useState([]);
  let userNow = selectedUser ? selectedUser : collector;

  const users = useQuery(Users, users => {
    return users.filtered(`isDeleted == false && email == $0`, userNow)
  }, [collector, user]);

  // const usersCoord = useQuery(Users, userCoor => {
  //   let userNow = users[0] ? users[0]._id : "";


  //   console.log(userNow, "userNow")

  //   // return userCoor.filtered('role == "teller" && referral == $0', String(userNow))}, [users]);
  //   return userCoor.filtered('role == "teller"')
  // }, [users]);

  const handleSelectCollector = (val) => {
    dispatch({ type: SET_SUMMARIZED_USER, payload: val.email })
    navigation.navigate('UserSummaryReport', JSON.stringify({ collector: val.email }))
  }

  const handleDoublePress = (val) => {
    // console.log()
    navigation.navigate('View User', JSON.stringify(val))
  }

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  function renderSearchInput() {
    return (
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginVertical: 10, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder='Search'
          placeholderTextColor={COLORS.gray800}
          style={{ height: 40, paddingLeft: 10, width: '90%', color: COLORS.black }}
        />
        <Image
          source={icons.search}
          style={{ height: '12%', width: '12%', padding: 10, }}
          resizeMode='contain'

        />
      </TouchableOpacity>
      // <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{drawTime == undefined || '' ? 'Select Draw Time' : moment(date).format('MM/DD/YYYY')}</Text>
    )
  }

    const handleMessageNavigation = (recepientId) => {
      
      const messengerData = realm.objects(Messages).filtered(`isDeleted == false && recepient == $0 && createdBy == $1`, String(recepientId), String(user?._id))
  
  
  
  
  
      if (messengerData[0]) {
        navigation.navigate('Messenger', JSON.stringify(messengerData[0]?._id))
      } else {
        navigation.navigate('Messenger', JSON.stringify(recepientId))
      }
  
  
    }

  const renderItem = ({ item, index }) => {
    let displayName = String(item.email).split('@')[0];
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

    return (
      <Animated.View
        key={index}
        entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
      >

        <TouchableOpacity
          onLongPress={() => (user && user.isAdmin) ? handleDoublePress(item) : console.log('Not Admin')}
          onPress={() => handleSelectCollector(item)}
          style={{
            flexDirection: 'row', 
            paddingVertical: 1,
            backgroundColor: backgroundColor,
            width: '100%'
          }}>
          <View
            style={{
              // backgroundColor: collector == list.email ? COLORS.primary : COLORS.gray400,
              backgroundColor: backgroundColor,
              padding: 10,
              flexDirection: 'column',
              alignItems: 'flex-start',
              paddingLeft: 10,
              width: '50%'

            }}>
            <Text style={{ fontSize: 18, color: COLORS.black900, fontWeight: 'bold' }}>
              {String(displayName).toUpperCase()}
            </Text>
            <Text style={{ fontWeight: '500', fontSize: 14, color: COLORS.darkGray2 }}>
              {item.address}
            </Text>
          </View>
                    <View style={{ width: '50%', alignItems: 'center', justifyContent: 'flex-end', padding: 10, flexDirection: 'row'}}>
                      {/* <Text style={{ color: COLORS.darkGray2, paddingRight: 10, fontSize: 14}}>
                        Started at:
                      </Text> */}
                      <TouchableOpacity 
                        style={{ paddingHorizontal: 10}}
                        onPress={() => handleMessageNavigation(item._id)}
                        // onPress={() => navigation.navigate('Messenger', JSON.stringify(item._id))}
                      >
                        <Image 
                          source={icons.send_message}
                          style={{ height: 35, width: 35, resizeMode: 'contain'}}
                        />
                      </TouchableOpacity>
                    </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  useEffect(() => {
    let userNow = users[0] ? users[0]._id : user._id;
    const currentUsers = realm.objects(Users).filtered('isDeleted == false &&  role == "teller" && referral == $0', String(userNow)).sorted('email');
    setUsersCoord(currentUsers)
  }, [realm, users])



  let filteredList = usersCoord;
  filteredList = searchQuery ? filteredList.filter(a => String(a.email).toLowerCase().includes(String(searchQuery).toLowerCase())) : filteredList;


  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: COLORS.gray300 }}>
      {renderSearchInput()}

      <FlatList
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={(item, index) => index}
        scrollEnabled
        ListEmptyComponent={
          <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              No records found.
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredList.length > 0 &&
          <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              End of results.
            </Text>
          </View>
        }
      />
    </View>
  );
};



export default TellersScreen;