import { FlatList, SafeAreaView, StyleSheet, Image, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { realmContext } from '../../RealmContext'
import moment from 'moment-timezone';
import { Messages, Users } from '../../Models';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, icons, SIZES } from '../../constants';
import { cutString } from '../../utils/helpers';

import { BSON } from 'realm';
const { useQuery, useRealm } = realmContext;



const Inbox = ({ navigation }) => {
  const { user } = useSelector(({ user }) => user);
  const dispatch = useDispatch();
  const realm = useRealm()
  const [searchQuery, setSearchQuery] = useState('');

  const messages = useQuery(Messages, message => {

    return message.filtered(`isDeleted == false && createdBy == $0 || recepient == $0 && recepient == $1 || createdBy == $1`, String(user?._id), String(user?._id)).sorted('updatedAt', true)
  }, [realm, user])

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


  const renderItem = ({ item, index }) => {
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
    const createdByDetails = realm.objectForPrimaryKey(Users, BSON.ObjectId(item.createdBy))
    // let indexArray = 1

    let lastMessageIndex = (item?.conversations.length - 1)
    let newMessages = item?.conversations.filter(a => {
      return (a.owner_id !== String(user?._id) && a.isViewed === false);
    })


    return (
      <Animated.View
        key={index}
        entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Messenger', JSON.stringify(item?._id))}
          style={{ paddingVertical: 14, width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: backgroundColor }}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', width: '70%' }}>
            <Text style={{ color: COLORS.black, fontSize: 18, fontWeight: '500' }}>
              {/* {String(item?.createdBy)} */}
              {String(String(item?.createdBy) == String(user?._id) ? item.recepientName : String(createdByDetails?.email).split('@')[0]).toUpperCase()}
            </Text>
            <View style={{ width: '70%', alignItems: 'flex-end', justifyContent: 'flex-start', flexDirection: 'row' }}>
              <Text style={{ color: COLORS.darkGray2, fontSize: 12, fontWeight: 'bold' }}>
                {/* {item?.conversations[lastMessageIndex]?.message} */}
                {item?.conversations[lastMessageIndex]?.owner_id == String(user?._id) ? 'You:' + ' ' + cutString(item?.conversations[lastMessageIndex]?.message, 20) : cutString(item?.conversations[lastMessageIndex]?.message, 20)}
              </Text>
              <Text style={{ color: COLORS.darkGray2, fontSize: 10, paddingLeft: 8 }}>
                {/* {moment(item?.conversations[lastMessageIndex]?.createdAt).format('HH:mm')} */}
                {moment(item?.conversations[lastMessageIndex]?.createdAt).startOf('minute').fromNow()}
              </Text>
            </View>

          </View>
          <View style={{ width: '30%', alignItems: 'flex-end', flexDirection: 'column' }}>
            {
              newMessages.length > 0 &&
              <View style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderRadius: SIZES.radius, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontSize: 12, textAlign: 'center' }}>
                  {newMessages.length}
                </Text>
              </View>
            }
          </View>

        </TouchableOpacity>

      </Animated.View>
    )
  }

  let filteredMessages = messages;
  filteredMessages = searchQuery ?
    filteredMessages?.filter(a => String(a.recepientName).toLowerCase().includes(String(searchQuery).toLowerCase())) :
    filteredMessages;


  return (
    <SafeAreaView style={{ flex: 1, padding: 10, backgroundColor: COLORS.gray300 }}>
      {renderSearchInput()}
      <FlatList
        data={filteredMessages}
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
          filteredMessages.length > 0 &&
          <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              End of results.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

export default Inbox

const styles = StyleSheet.create({})