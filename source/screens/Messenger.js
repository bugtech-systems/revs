import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Alert, Platform } from 'react-native'
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { COLORS, icons, SIZES } from '../constants'
import { realmContext } from '../RealmContext'
import moment from 'moment-timezone';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { useObject } from '@realm/react';
import { Messages, Users } from '../Models';
import { BSON } from 'realm';
import { Image } from 'react-native';
import { FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageViewer from "react-native-image-zoom-viewer";
import Config from 'react-native-config';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { SET_LOADING, STOP_LOADING } from '../redux/actions/types';
import { SyncComponent } from '../components/SyncComponent';

const { useQuery, useRealm } = realmContext;

const Messenger = ({ route, navigation }) => {
    const { user } = useSelector(({ user }) => user);
    const dispatch = useDispatch();
    const realm = useRealm()
    const flatListRef = useRef(null);
    const messageId = JSON.parse(route.params);
    const [textInput, setTextInput] = useState("");
    // const [messages, setMessages] = useState(null);
    // const [senderName, setSenderName] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);

    const [selectedImage, setSelectedImage] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const messages = useQuery(Messages, message => {

        return message.filtered(`isDeleted == false && _id == $0`, BSON.ObjectId(messageId))
    }, [realm, user])[0]


    const requestStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
            return result === RESULTS.GRANTED;
        } else {
            const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
            return result === RESULTS.GRANTED;
        }
    };


    const saveImage = async () => {
        try {
            const hasPermission = await requestStoragePermission();
            if (!hasPermission) {
                Alert.alert("Permission Denied", "Please grant storage permission to save images.");
                return;
            }

            const filename = `image_${Date.now()}.jpg`;
            const downloadPath = `${RNFS.DownloadDirectoryPath}/${filename}`;

            const response = await RNFS.downloadFile({
                fromUrl: selectedImage, // The image URL
                toFile: downloadPath,
            }).promise;

            if (response.statusCode === 200) {
                Alert.alert("Success", "Image saved to gallery!");
            } else {
                Alert.alert("Error", "Failed to save the image.");
            }
        } catch (error) {
            console.error("Error saving image:", error);
            Alert.alert("Error", "Could not save the image.");
        }
    };

    const handleSaveImage = (uri) => {
        console.log(uri, "HANDLE SAVE IMAGE!")

        return;
    }

    const handleImageUpload = async () => {
        try {
            const imagePick = await pickImage();
            const image = imagePick.assets[0];
            const formData = new FormData();
            const fileExtension = String(image.fileName).split('.')

            const dateName = moment().tz('Asia/Manila').format('MMDDYY_hh_mm_ss')


            console.log(dateName)
            formData.append('file', {
                uri: image.uri,
                type: image.type,
                name: `${messages._id}${dateName}_message.${fileExtension[fileExtension.length - 1]}`,
            });

            console.log('IMAGE DETAILS', image)

            const response = await axios.post(`${Config.FILE_UPLOAD_URL}/apiv2/v1/auth/apk`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });


            console.log(response.data.fileName, 'UPLOAD RESPONSE')
            setImageUrl(`${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}`);

            //   await realm.write( async () => {
            //   draws[0].tipUrl = `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}`;
            // })
        } catch (error) {
            console.log('Error uploading image:', error);
        }
    };




    const pickImage = () => {

        console.log('PICKING')
        dispatch({ type: SET_LOADING })

        return new Promise((resolve, reject) => {
            const options = {
                title: 'Select Image',
                saveToPhotos: true,
                storageOptions: {
                    skipBackup: true,
                    path: 'images'
                },
            };

            launchImageLibrary(options, (response) => {
                if (response.didCancel) {
                    // (new Error('User cancelled image picker'));
                    dispatch({ type: STOP_LOADING })
                    console.log("User cancelled image picker");
                } else if (response.errorMessage) {
                    console.log('ImagePicker Error:', response.errorMessage);
                    dispatch({ type: STOP_LOADING })
                    // reject(new Error('ImagePicker Error'));
                } else {
                    console.log('ImagePicker Response:', response);
                    resolve(response, 'RESOLVED IMAGE PICKER');
                    dispatch({ type: STOP_LOADING })
                    // const source = { uri: response.assets[0].uri };
                    // setImageUrl(source)
                }
            });
        });
    };



    const [rnd, setRnd] = useState(0);
    const today = moment().tz('Asia/Manila').toDate();

    const senderName = realm.objectForPrimaryKey(Users, BSON.ObjectId(messages ? messages.createdBy : messageId))


    let displayName = String(senderName?.email).split('@')[0];

    const renderHeader = () => {
        return (
            // <View style={{ paddingVertical: 8, backgroundColor: '#fffff1', width: '100%', elevation: 2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        // width: '10%', 
                        padding: 8,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Image
                        source={icons.backHeader}
                        style={{ height: 25, width: 25, resizeMode: 'contain', tintColor: COLORS.black }}
                    />
                </TouchableOpacity>
                <View style={{ width: '50%', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                    <Text style={{ color: COLORS.black900, fontWeight: '500', fontSize: 20 }}>
                        {String(messages?.createdBy == String(user?._id) ? messages?.recepientName : displayName).toUpperCase()}
                    </Text>
                    {/* <Text style={{ color: COLORS.darkGray2, fontSize: 14}}>
                        {String(senderName.address)}
                    </Text> */}
                    <Text style={{ color: COLORS.black, fontSize: 10, }}>{isTyping ? "Typing ..." : null}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', width: '40%', justifyContent: 'flex-end' }}>
                    <SyncComponent />
                </View>
            </View>
        )

    }

    const renderMessage = ({ item, index }) => (
        <Animated.View
            key={index}
            entering={FadeInDown.delay(index * 30).duration(500)} // Staggered animation
        >
            {
                item?.message ?
                    <View
                        style={[styles.messageBubble, String(item.owner_id) == String(user?._id) ? styles.sent : styles.received]}
                    >

                        {/* <Text style={{...styles.messageText, color: item?.sent ? COLORS.white : COLORS.black }}>{item.text}</Text> */}
                        {/* <Text style={{...styles.timeText, color: item?.sent ? COLORS.white : COLORS.black}}>{item.time}</Text> */}
                        <View style={{ maxWidth: '80%', paddingVertical: 10, flexDirection: 'column' }}>
                            <Text style={{ ...styles.messageText, fontWeight: '400', color: item.owner_id == String(user?._id) ? COLORS.white : COLORS.black }}>
                                {item.message}
                            </Text>
                        </View>
                        <View style={{ maxWidth: '20%', padding: 6, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                            <Text style={{ ...styles.timeText, color: item.owner_id == String(user?._id) ? COLORS.white2 : COLORS.darkGray2 }}>
                                {moment(item.createdAt).format('H:ss')}
                            </Text>
                        </View>
                    </View>
                    :
                    null
            }

            {
                item?.imageUrl ?
                    <View style={{ alignSelf: String(item.owner_id) == String(user?._id) ? 'flex-end' : 'flex-start', flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedImage(`${item?.imageUrl}`)
                                setIsModalVisible(true)
                            }}
                            style={[String(item.owner_id) == String(user?._id) ? styles.sent : styles.received, { width: 150, height: 200, borderWidth: 1, borderColor: COLORS.transparentBlack1, borderRadius: 6, backgroundColor: COLORS.transparentBlack1 }]}
                        >

                            <Image
                                source={{ uri: item?.imageUrl }}
                                style={{ height: '100%', width: '100%' }}
                                alt={item?.imageUrl}
                                resizeMode='contain'
                            />
                        </TouchableOpacity>
                        {
                            String(item.owner_id) !== String(user?._id) &&

                            <TouchableOpacity
                                onPress={() => saveImage()}
                                style={{ padding: 6, borderWidth: 1, marginLeft: 4, borderRadius: SIZES.radius / 3, backgroundColor: COLORS.gray300, borderColor: COLORS.gray300 }}
                            >
                                <Image
                                    source={icons.save}
                                    style={{ height: 25, width: 25, resizeMode: 'contain', tintColor: COLORS.darkGray2 }}
                                />
                            </TouchableOpacity>
                        }
                    </View>

                    :
                    null
            }
        </Animated.View>
    );





    const sendMessage = async () => {
        let messageArray = messages?.conversations;
        let newMessageObj = {
            owner_id: String(user?._id),
            message: textInput,
            imageUrl: imageUrl,
            isViewed: false,
            createdAt: moment(today).toDate()
        }
        if (!messages) {
            realm.write(async () => {
                let newConversation = new Messages(realm, {
                    createdBy: String(user?._id),
                    recepient: String(messageId),
                    recepientName: String(displayName),
                    conversations: [newMessageObj],
                    isDeleted: false,
                    createdAt: moment(today).toDate(),
                    updatedAt: moment(today).toDate(),
                })
                navigation.replace('Messenger', JSON.stringify(newConversation._id))
            })

        } else {
            realm.write(() => {
                messageArray.push(newMessageObj)
                messages.updatedAt = moment(today).toDate();
            })
        }
        setImageUrl(null);
        setTextInput("");
        setRnd(Math.random())
    };

    const handleMessages = async () => {
        if (messages?.conversations?.length > 0) {
            let conversationArray = messages?.conversations;

            let viewReceivedMessages = conversationArray.filter(a => {
                return (a.owner_id !== String(user?._id) && a.isViewed === false);
            })

            if (viewReceivedMessages.length > 0) {
                viewReceivedMessages.map(message => {
                    realm.write(() => {
                        message.isViewed = true
                    })
                    return
                })

            } else {
                console.log('Nothing to update yet.')
            }
        }
        return;
    }


    useEffect(() => {
        if (flatListRef.current && messages?.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }

        return () => {
            handleMessages(); // Runs when the component unmounts
        };
    }, [messages, realm])


    return (
        <SafeAreaView style={styles.container}>
            <Modal visible={isModalVisible} transparent={true}>
                <ImageViewer
                    imageUrls={[{
                        url: selectedImage
                    }]}
                    enableSwipeDown={true}
                    onDoubleClick={() => {
                        setSelectedImage('')
                        setIsModalVisible(false)
                    }}
                    onSwipeDown={() => {
                        setSelectedImage('')
                        setIsModalVisible(false)
                    }}
                    onCancel={() => {
                        setSelectedImage('')
                        setIsModalVisible(false)
                    }}
                />
            </Modal>
            {renderHeader()}
            {/* Message List */}
            <FlatList
                ref={flatListRef}
                data={messages?.conversations}
                keyExtractor={(item, index) => index}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                initialNumToRender={messages?.conversations.length}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />


            {/* Message Input */}
            <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', width: '90%', paddingHorizontal: 6, backgroundColor: "#f1f1f1", borderRadius: 20, }}>
                    <TextInput
                        style={{ color: COLORS.black, fontSize: 16, width: '90%' }}
                        placeholder="Text message"
                        placeholderTextColor={COLORS.black}
                        value={textInput}
                        onChangeText={setTextInput}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={() => handleImageUpload()}>
                        <Image
                            source={icons.add_image}
                            style={{ height: 25, width: 25, tintColor: COLORS.primary }}
                        />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.sendButton} disabled={textInput == '' && imageUrl == null} onPress={sendMessage}>
                    <Image
                        source={icons.sendIcon}
                        style={{ height: 25, width: 25, tintColor: textInput == '' && imageUrl == null ? COLORS.darkgray : COLORS.primary }}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

export default Messenger

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white2,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        width: '100%',
        justifyContent: 'flex-start',
        // justifyContent: 'space-between',
        backgroundColor: '#fffff1',
        borderBottomWidth: 1,
        elevation: 2,
        borderBottomColor: '#fffff1',
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 16,
        color: "#000",
    },
    messageList: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    messageBubble: {
        maxWidth: "80%",
        flexDirection: 'row',
        // borderWidth: .5,
        borderRadius: 18,
        // borderTopRightRadius: 20,
        paddingHorizontal: 10,
        marginVertical: 6,
    },
    sent: {
        alignSelf: "flex-end",
        backgroundColor: '#0CC27D',
        borderBottomRightRadius: 2, // To mimic the speech tail

    },
    received: {
        alignSelf: "flex-start",
        backgroundColor: COLORS.gray400,
        borderBottomLeftRadius: 2, // To mimic the speech tail

    },
    messageText: {
        fontSize: 18,
    },
    timeText: {
        fontSize: 12,
        color: "#888",
        textAlign: "right",
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e5e5",
    },
    textInput: {
        flex: 1,
        flexDirection: 'row',
        padding: 10,
        fontSize: 16,
        backgroundColor: "#f1f1f1",
        borderRadius: 20,
        marginRight: 8,
    },
    sendButton: {
        // backgroundColor: "#007aff",
        width: '10%',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center'
        // borderRadius: 20,
    },
    backIcon: {
        height: 25,
        width: 25,
        // marginHorizontal: SIZES.padding * 1.5,
        tintColor: COLORS.transparentBlack7,
        // marginBottom: SIZES.padding
    },
});