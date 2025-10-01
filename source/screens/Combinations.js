import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  Animated,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
  Switch,
} from 'react-native';
import { realmContext } from '../RealmContext';
import { Betting, Combinations, Draws, Users } from '../Models';
import * as Progress from 'react-native-progress';
import moment from 'moment-timezone';
import SortIcon from 'react-native-vector-icons/Octicons';
import { COLORS, icons, SIZES } from '../constants';
import { useSelector } from 'react-redux';
import { getConfiguration } from '../utils/helpers';

const { useRealm, useQuery } = realmContext;

const screenWidth = Dimensions.get('window').width;

const filterOptions = [
  'Permutation Set',
  // 'Combination Picks',
  'Nuetral Numbers',
  'Cold Numbers',
  'Hot Numbers',
];

const sortOptions = [
  'Digit (DESC)',
  'Digit (ASC)',
  'Straight Limit (DESC)',
  'Straight Limit (ASC)',
  'Straight Amount (DESC)',
  'Straight Amount (ASC)',
  'Ramble Limit (DESC)',
  'Ramble Limit (ASC)',
  'Ramble Amount (DESC)',
  'Ramble Amount (ASC)',
  'Win Frequency (DESC)',
  'Win Frequency (ASC)',
];

const CombinationsScreen = ({ navigation }) => {
  const realm = useRealm();
  const fadeAnim = useRef(new Animated.Value(1)).current; // start fully visible

  const { collector, user, selectedUser, configuration, userConfig } = useSelector(({ user }) => user);
  const [date, setDate] = useState(new Date());
  const combinations = useQuery(Combinations);
  const [selectedCategory, setSelectedCategory] = useState('Permutation Set');
  const [selectedSort, setSelectedSort] = useState('Digit (DESC)');
  const [filterModal, setFilterModal] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [tempValues, setTempValues] = useState({ digit: '', straightLimit: '', rambleLimit: '', straightMaxLimit: '', rambleMaxLimit: '', isWinTo: null });
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();
  const limitPerPage = 10;
  const [appliedFilter, setAppliedFilter] = useState({
    selectedCategory: 'Permutation Set',
    selectedSort: 'Digit (DESC)'
  })
  const [page, setPage] = useState(1);

  // State for search query
  const [searchQuery, setSearchQuery] = useState("");

  const draws = useQuery(Draws, draw => {

    return draw.filtered(
      'drawDate >= $0 && drawDate < $1',
      startOfDay, endOfDay
    ).sorted('gameTime');
  }, [users, date])

  function getTimeRange() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMins = currentTime.getMinutes();
    let card2pm = ((currentHour >= 13 && currentMins >= 55) || draws.filter(a => a.gameTime == '2pm')[0]);
    let card5pm = ((currentHour >= 16 && currentMins >= 55) || draws.filter(a => a.gameTime == '5pm')[0]);
    let card9pm = ((currentHour >= 20 && currentMins >= 55) || draws.filter(a => a.gameTime == '9pm')[0]);

    if (!card2pm && !card5pm && !card9pm) {
      return "2pm";
    } else if (card2pm && !card5pm) {
      return "5pm";
    } else if (card5pm && !card9pm) {
      return "9pm";
    } else {
      return "";
    }
  }

  let curGameTime = getTimeRange();
  // let curGameTime = '5pm'

  let collectorName = selectedUser ? selectedUser : collector;
  const users = useQuery(Users, user => user.filtered('email == $0', collectorName), [collectorName]);
  const bettings = useQuery(Betting, data => {
    let userNow = users[0] ? users[0]._id : "";
    return data.filtered('ANY uplines == $0 && isDeleted == false && inputType == "normal" && timestamp >= $1 && timestamp <= $2 && gameTime == $3', String(userNow), startOfDay, endOfDay, curGameTime).sorted('timestamp');
  }, [user]);

  // Filter data by category + search query
  const filteredData = useMemo(() => {
    let data;

    switch (selectedCategory) {
      case "Nuetral Numbers":
        data = combinations.filtered('riskLevel == "neutral"');
        break;
      case "Hot Numbers":
        data = combinations.filtered('riskLevel == "hot"');
        break;
      case "Cold Numbers":
        data = combinations.filtered('riskLevel == "cold"');
        break;
      // case "Combination Picks":
      //   data = bettings;
      //   break;
      default:
        data = combinations;
        break;
    }

    // Apply search filter if query is not empty
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        item?.digit?.toString().toLowerCase().includes(query)
      );
    }

    return data;
  }, [selectedCategory, combinations, bettings, searchQuery]);

  // /Sort data (unchanged)
  const sortedData = useMemo(() => {
    const data = [...filteredData];

    const sortMap = {
      "Digit (DESC)": ["digit", "desc"],
      "Digit (ASC)": ["digit", "asc"],
      "Straight Limit (DESC)": ["straightLimit", "desc"],
      "Straight Limit (ASC)": ["straightLimit", "asc"],
      "Straight Amount (DESC)": ["straightTotal", "desc"],
      "Straight Amount (ASC)": ["straightTotal", "asc"],
      "Ramble Limit (DESC)": ["rambleLimit", "desc"],
      "Ramble Limit (ASC)": ["rambleLimit", "asc"],
      "Ramble Amount (DESC)": ["rambleTotal", "desc"],
      "Ramble Amount (ASC)": ["rambleTotal", "asc"],
      "Win Frequency (DESC)": ["winFrequency", "desc"],
      "Win Frequency (ASC)": ["winFrequency", "asc"],
    };

    const [key, direction] = sortMap[selectedSort] || [];

    if (!key) return data;

    return data.sort((a, b) => {
      const aVal = typeof a[key] === "string" ? parseInt(a[key]) : a[key];
      const bVal = typeof b[key] === "string" ? parseInt(b[key]) : b[key];
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, selectedSort]);

  // Pagination (unchanged)
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limitPerPage;
    return sortedData.slice(start, start + limitPerPage);
  }, [sortedData, page]);

  const totalPages = Math.ceil(sortedData.length / limitPerPage);

  // const handleUpdateField = (item, values) => {
  //   realm.write(() => {
  //     item.straightLimit = parseInt(values.straightLimit);
  //     item.rambleLimit = parseInt(values.rambleLimit);
  //     item.maxLimit = parseInt(values.maxLimit);
  //   });
  //   setModalVisible(false);
  // };

  const canSetHotNumber = getConfiguration(user, 'withWin200')?.isCheck;

  const handleUpdateField = (item, values) => {
    realm.write(() => {
      item.straightLimit = Number(values?.straightLimit);
      item.rambleLimit = Number(values?.rambleLimit);
      item.straightMaxLimit = Number(values?.straightMaxLimit);
      item.rambleMaxLimit = Number(values?.rambleMaxLimit);
      item.riskLevel = values?.isWinTo ? 'hot' : item?.winFrequency != 0 ? 'cold' : 'nuetral';
      item.isWinTo = values?.isWinTo; // ✅ persist switch value
    });
    setModalVisible(false);
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset pagination to page 1
    setFilterModal(false); // Close modal
    setAppliedFilter({
      selectedCategory,
      selectedSort
    })
    console.log('Applied:', { selectedCategory, selectedSort });
  };
  const renderItem = ({ item, index }) => {
    const isEditing = editingId === item._id.toString();
    const straightProgress = item?.straightLimit > 0 ? item?.straightTotal / item?.straightLimit : 0;
    const rambleProgress = item?.rambleLimit > 0 ? item?.rambleTotal / item?.rambleLimit : 0;
    const straightPercentage = Math.min(Math.round(straightProgress * 100), 100);
    const ramblePercentage = Math.min(Math.round(rambleProgress * 100), 100);
    const backgroundColor = index % 2 === 0 ? '#f3f3f3ff' : COLORS.gray200;

    return (
      (appliedFilter?.selectedCategory == 'Permutation Set' || appliedFilter?.selectedCategory == 'Hot Numbers' || appliedFilter?.selectedCategory == 'Cold Numbers' || appliedFilter?.selectedCategory == 'Nuetral Numbers') ? (
        <>
          {/* Combination List */}
          {/* [Unchanged combination list layout and modal - omitted here for brevity since you already have it] */}
          {/* Pagination Controls for combinations */}
          {/* Your existing combination list and layout code here */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
            <TouchableOpacity
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                backgroundColor: backgroundColor,
                marginBottom: 2,
                padding: 10,
              }}
              onLongPress={() => {
                setEditingItem(item);
                setTempValues({
                  digit: item?.digit.toString(),
                  straightLimit: item.straightLimit.toString(),
                  rambleLimit: item.rambleLimit.toString(),
                  straightMaxLimit: item.straightMaxLimit?.toString(),
                  rambleMaxLimit: item.rambleMaxLimit?.toString(),
                  maxLimit: item.maxLimit?.toString() || '0',
                  isWinTo: item?.isWinTo
                });
                setModalVisible(true);
              }}
            >
              <View style={{ position: 'absolute', margin: 2, flexDirection: 'row', right: 0, top: 4 }}>
                {item?.isWinTo && (
                  <Text style={{ ...styles.text, fontSize: 10, fontWeight: 'bold', marginHorizontal: 4, paddingHorizontal: 10, borderRadius: SIZES.radius / 4, backgroundColor: COLORS.success500 }}>WINTO</Text>
                )}
              </View>

              <View key={item?._id.toString()} style={{ ...styles.card, alignItems: 'flex-start' }}>
                <Text style={{ ...styles.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>{item?.digit?.split('').join('-')}</Text>

                {isEditing ? (
                  <>
                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <Text style={styles.text}>Straight Limit:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder='Straight Limit'
                        defaultValue={item?.straightLimit.toString()}
                        keyboardType="numeric"
                        onChangeText={(text) => handleUpdateField(item?._id.toString(), 'straightLimit', text)}
                      />
                    </View>

                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <Text style={styles.text}>Ramble Limit: </Text>
                      <TextInput
                        style={styles.input}
                        placeholder='Ramble Limit'
                        defaultValue={item?.rambleLimit.toString()}
                        keyboardType="numeric"
                        onChangeText={(text) => handleUpdateField(item?._id.toString(), 'rambleLimit', text)}
                      />
                    </View>
                    <Text style={styles.text}>Winto: {item?.isWinTo ? '✅ True' : '❌ False'}</Text>
                  </>
                ) : (
                  <>
                    <View style={{ marginVertical: 10, flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
                      <View style={{ flexDirection: 'column', width: '50%', alignItems: 'flex-start' }}>
                        <Text style={{ ...styles.text, color: COLORS.black }}>
                          Straight Limit: {Number(item?.straightLimit).toFixed(2)}
                        </Text>

                        <View style={{ flexDirection: 'column', width: '100%' }}>
                          <Progress.Bar
                            progress={straightProgress}
                            width={200}
                            height={16}
                            borderRadius={10}
                            color={COLORS.secondaryTransparent}
                            unfilledColor={COLORS.unfilledBar}
                            borderWidth={0}
                          />
                          <Text style={{ ...styles.progressText, right: straightPercentage == '100' ? 20 : 0, paddingLeft: straightPercentage == '100' ? 0 : 10, textAlign: straightPercentage == '100' ? 'center' : 'left' }}>{straightPercentage == '100' ? 'MAX' : `Straight Total: ${straightPercentage}%`}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'column', width: '50%', alignItems: 'flex-start' }}>
                        <Text style={{ ...styles.text, color: COLORS.black }}>
                          Ramble Limit: {Number(item?.rambleLimit).toFixed(2)}
                        </Text>

                        <View style={{ flexDirection: 'column', width: '100%' }}>
                          <Progress.Bar
                            progress={rambleProgress}
                            width={200}
                            height={16}
                            borderRadius={10}
                            color={COLORS.secondaryTransparent}
                            unfilledColor={COLORS.unfilledBar}
                            borderWidth={0}
                          />
                          <Text style={{ ...styles.progressText, right: ramblePercentage == '100' ? 20 : 0, paddingLeft: ramblePercentage == '100' ? 0 : 10, textAlign: ramblePercentage == '100' ? 'center' : 'left' }}>{ramblePercentage == '100' ? 'MAX' : `Ramble total: ${ramblePercentage}%`}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>


                        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.black800 }}>
                          Win Frequency: </Text>
                        <Text
                          style={{
                            fontSize: 12, fontWeight: '500', color: COLORS.warningBorderColor
                          }}
                        >
                          {item?.winFrequency}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <Text style={{
                          fontSize: 12, fontWeight: '500', color: COLORS.black800
                          // ...styles.text,
                          // textAlign: 'center',
                          // fontSize: 10,
                          // fontWeight: 'bold',
                          // color: COLORS.primaryTransparent2,
                          // paddingHorizontal: 10,
                          // marginHorizontal: 4,
                          // backgroundColor: item?.riskLevel === 'cold' ? COLORS.primary : COLORS.transparentRed,
                          // borderRadius: SIZES.radius / 4,
                        }}>
                          Risk Level:
                        </Text>
                        <Text
                          style={{ fontWeight: 'bold', fontSize: 12, color: item?.riskLevel == 'cold' ? COLORS.primaryTransparent1 : item?.riskLevel === 'hot' ? COLORS.transparentRed : COLORS.success }}
                        >
                          {item?.riskLevel === 'cold' ? " COLD NUMBER" : item?.riskLevel === 'hot' ? " HOT NUMBER" : " NUETRAL NUMBER"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <Text
                          style={{
                            fontSize: 12, fontWeight: '500', color: COLORS.black800

                          }}
                        >
                          Max limit: </Text>
                        <Text style={{
                          fontSize: 12, fontWeight: '500', color: COLORS.black800
                        }}>
                          {Number(item?.straightMaxLimit + item?.rambleMaxLimit) ?? 0}
                        </Text>
                      </View>

                    </View>

                  </>
                )}
              </View>
            </TouchableOpacity>

          </ScrollView>
        </>
      )
        :
        appliedFilter?.selectedCategory == 'Combination Picks' ? (
          <>
            {/* Paginated Bettings List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
              {/* <Text style={styles.title}>Bettings List</Text> */}
              <View key={item._id} style={{ ...styles.ticketContainer, marginVertical: 10, borderWidth: 1, borderRadius: SIZES.radius / 3, padding: 12, backgroundColor: COLORS.gray300, borderColor: COLORS.gray400, elevation: 2 }}>
                <Text style={styles.ticketHeader}>Ticket No: {item.ticketNo}</Text>
                {item.combinations.map((combo) => (
                  <View key={combo._id} style={{ marginTop: SIZES.padding / 2 }}>
                    <Text style={styles.text}>Digit: {combo.combination}</Text>
                    <Text style={styles.text}>Bet Type: {combo.betType}</Text>
                    {combo.betType === 'T' && <Text style={styles.text}>Target Amount: {combo.targetAmount}</Text>}
                    {combo.betType === 'R' && <Text style={styles.text}>Ramble Amount: {combo.rambleAmount}</Text>}
                    {combo.betType === 'R - T' && (
                      <>
                        <Text style={styles.text}>Target Amount: {combo.targetAmount}</Text>
                        <Text style={styles.text}>Ramble Amount: {combo.rambleAmount}</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

          </>
        )
          :
          null
    )
  };

  let emptyString = ''

  let combs = useQuery(Combinations, combination => {
    return combination.filtered(`digit != $0`, emptyString);
  }, [user, draws])

  let occupiedComb = combs.filter(data => {
    return data.straightTotal != 0 || data.rambleTotal != 0
  });

  let vacantComb = combs.filter(data => {
    return data.straightTotal == 0 && data.rambleTotal == 0
  });

  // Calculate total amount for straight and ramble
  let totalStraightAmount = combs.reduce((sum, item) => sum + (item.straightTotal || 0), 0);
  let totalRambleAmount = combs.reduce((sum, item) => sum + (item.rambleTotal || 0), 0);

  // Filtered data based on digit
  const filteredItems = paginatedData.filter((item) =>
    item?.digit?.toString().includes(searchQuery)
  );

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.1, // faded out
          duration: 3000, // 1 second fade out
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, // fully visible
          duration: 2000, // 1 second fade in
          useNativeDriver: true,
        }),
      ])
    );

    blink.start();

    // Cleanup on unmount
    return () => blink.stop();
  }, [fadeAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white, }}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          // borderWidth: 1,
          elevation: 2,
          // borderRadius: 12,
          backgroundColor: COLORS.warningTransparent,
          shadowColor: COLORS.warningTransparent,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', padding: 10
        }}
      >
        <Text style={{
          color: COLORS.black,
          fontSize: 14,
          fontWeight: '600',
        }}>
          {!curGameTime ? "Draw status: OFFLINE" : `Draw time: ${String(curGameTime).toUpperCase()}`}
        </Text>
        <Text style={{ color: COLORS.black, fontSize: 14, fontWeight: '600' }}>
          {moment(moment().toDate()).format('MMMM DD, YYYY')}
        </Text>
      </Animated.View>
      {/* Filter / Sort Header */}
      {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Draw: {moment().format('MMMM D, YYYY')}</Text>
        <TouchableOpacity onPress={() => setFilterModal(true)}>
          <SortIcon name="settings" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View> */}
      <View style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: 'row', paddingHorizontal: SIZES.padding }}>


        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', width: '50%' }}>
          <Text style={{ fontSize: 14, color: COLORS.darkGray2, fontWeight: '500', textAlign: 'center', paddingRight: SIZES.padding / 2 }}>
            Straight/Ramble:
          </Text>
          <Text
            style={{ fontSize: 15, color: COLORS.warningBorderColor, fontWeight: 'bold', textAlign: 'center', paddingRight: SIZES.padding / 2 }}
          >
            {totalStraightAmount}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.darkGray2 }}>
              /
            </Text>{totalRambleAmount}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: COLORS.darkGray2, fontWeight: '500', textAlign: 'center' }}>
          Occupied Combinations: {occupiedComb.length}
        </Text>

      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 1 }}
        ListHeaderComponent={
          <View
            style={{
              ...styles.controls,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              width: '100%',
              padding: 10
            }}>
            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Search Input should be placed here with width equals to 80%. */}
              <TextInput
                style={{
                  width: "90%",
                  borderWidth: 1,
                  borderColor: COLORS.gray400,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  fontSize: 14,
                  color: COLORS.black,
                }}
                placeholder="Search by digit..."
                placeholderTextColor={COLORS.gray500}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={{
                  padding: 10,
                  alignSelf: 'flex-end',
                }}
                onPress={() => {
                  setFilterModal(true);
                }}
              >
                <SortIcon
                  name='multi-select'
                  size={22}
                  color={COLORS.black800}
                />
              </TouchableOpacity>
            </View>
          </View>}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.darkGray2, fontSize: 12 }}>
              No records found.
            </Text>
          </View>
        }
        ListFooterComponent={
          paginatedData.length > 0 && (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: SIZES.padding * 2
            }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.darkGray2 }}>
                End of results
              </Text>
            </View>
          )
        }
      />
      {/* Filter Modal */}
      <Modal visible={filterModal} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Header with Back Button */}
          <View
            style={{ paddingHorizontal: 10, paddingVertical: SIZES.padding, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', backgroundColor: COLORS.secondary, flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => {
                setFilterModal(false)
              }}
              style={{
                width: 30,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={icons.backHeader}
                style={{ height: 25, width: '100%', tintColor: COLORS.white }}
              />
            </TouchableOpacity>
            <View stlye={{ marginLeft: 30, marginBottom: 20, borderWidth: 4, borderColor: COLORS.white }}>
              <Text style={{ fontSize: 22, fontWeight: '500', color: COLORS.white, paddingBottom: 6 }}>
                Sort & Filter
              </Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.filterOptionWrap}>
              {filterOptions.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedCategory(item)}
                  style={[
                    styles.filterOptionButton,
                    selectedCategory === item && styles.filterSelectedOption
                  ]}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCategory === item && styles.filterSelectedText
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterOptionWrap}>
              {sortOptions.map((item) => {
                const isDisabled = selectedCategory === "Combination Picks";
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setSelectedSort(item)}
                    disabled={isDisabled}
                    style={[
                      styles.filterOptionButton,
                      selectedSort === item && styles.filterSelectedOption,
                      isDisabled && { backgroundColor: COLORS.gray300, borderColor: COLORS.gray300 } // ✅ Disabled background
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedSort === item && styles.filterSelectedText,
                        isDisabled && { color: COLORS.gray600 } // ✅ Disabled text color
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )
              }
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[
                  styles.filterActionButton,
                  {
                    backgroundColor: COLORS.gray400,
                    elevation: 2,
                    shadowColor: COLORS.gray400,
                    borderWidth: 1,
                    borderColor: COLORS.gray400
                  }
                ]}
                onPress={() => setFilterModal(false)}
              >
                <Text style={{ ...styles.filterActionText, fontWeight: 'bold', color: COLORS.secondary }}>
                  Close
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterActionButton, { backgroundColor: COLORS.secondary }]}
                onPress={() => {
                  handleApplyFilters();
                  console.log('Applied:', { selectedCategory, selectedSort });
                  setFilterModal(false);
                }}
              >
                <Text style={styles.filterActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>


      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header with Title + Switch */}
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={styles.modalTitle}>
                Edit Combination: {tempValues?.digit}
              </Text>

              {/* Switch Container */}
              {
                canSetHotNumber ?

                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.gray600,
                      borderRadius: SIZES.radius,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      // paddingHorizontal: 6,
                      width: '32%'
                      // paddingVertical: 4,
                    }}
                  >
                    <View style={{ width: '60%', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.secondary }}>
                        HOT #
                      </Text>
                    </View>
                    <View
                      style={{
                        borderColor: COLORS.gray600,
                        borderTopEndRadius: SIZES.radius / 2,
                        borderBottomEndRadius: SIZES.radius / 2,
                        backgroundColor: COLORS.gray300,
                        alignItems: 'center',
                        width: '40%',
                        justifyContent: 'center',
                        borderWidth: .5
                      }}>
                      <Switch
                        trackColor={{ false: COLORS.gray600, true: COLORS.transparentDanger2 }}
                        thumbColor={tempValues?.isWinTo ? COLORS.red : COLORS.transparentDanger}
                        ios_backgroundColor="#3e3e3e"
                        value={tempValues?.isWinTo ?? false}
                        onValueChange={(value) =>
                          setTempValues({ ...tempValues, isWinTo: value })
                        }
                      />
                    </View>
                  </View>
                  :
                  null
              }
            </View>

            {/* Input Fields */}
            {["straightLimit", "rambleLimit", "straightMaxLimit", "rambleMaxLimit"].map((field) => (
              <View key={field}>
                <Text
                  style={{
                    color: COLORS.black,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {
                    field === "straightLimit"
                      ? "Straight Limit:"
                      : field === "rambleLimit"
                        ? "Ramble Limit:"
                        : field === "straightMaxLimit"
                          ? "Straight Max Limit:"
                          : "Ramble Max Limit:"
                  }
                </Text>
                <TextInput
                  key={field}
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder={"0"}
                  value={tempValues[field]}
                  onChangeText={(text) =>
                    setTempValues({ ...tempValues, [field]: text })
                  }
                />
              </View>
            ))}

            {/* Footer Buttons */}
            <View style={{ ...styles.modalActions, width: "100%" }}>
              <Pressable
                style={{
                  backgroundColor: COLORS.gray400,
                  width: "48%",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: COLORS.secondary,
                    textAlign: "center",
                  }}
                >
                  CANCEL
                </Text>
              </Pressable>

              <Pressable
                style={{
                  backgroundColor: COLORS.secondary,
                  paddingVertical: 8,
                  width: "48%",
                  paddingHorizontal: 16,
                  borderRadius: 12,
                }}
                onPress={() => {
                  // Save to Realm
                  handleUpdateField(editingItem, tempValues);
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: COLORS.white,
                    textAlign: "center",
                  }}
                >
                  SAVE
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Pagination */}
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => setPage(page - 1)}
          disabled={page === 1}
          style={[styles.pageButton, page === 1 && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>

        <Text style={{ ...styles.pageNumber, color: COLORS.black }}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          onPress={() => setPage(page + 1)}
          disabled={page === totalPages}
          style={[styles.pageButton, page === totalPages && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CombinationsScreen;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary
  },
  modalInput: {
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    // padding: 10,
    alignItems: 'stretch',
    backgroundColor: COLORS.white
  },
  card: {
    width: '100%',
    flexDirection: 'column',
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.black800,
  },
  input: {
    borderRadius: 6,
    width: '24%',
    fontSize: 16,
  },
  editButton: {
    padding: 4,
    alignItems: 'center',
  },
  controls: {
    // padding: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  sortButton: {
    // height: 22,
    backgroundColor: COLORS.white,
    alignItems: 'flex-start',
    width: '100%',
    borderRadius: 6,
    borderColor: COLORS.gray600,
    // marginTop: 10,
    justifyContent: 'flex-end',
  },
  dropdown: {
    width: '90%',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    elevation: 3,
    borderWidth: .2
  },
  pageButton: {
    padding: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: COLORS.gray400,
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pageNumber: {
    fontSize: 16,
  },
  dropdownItemStyle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownItemTxtStyle: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  // modalTitle: {
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   marginBottom: 10,
  // },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  filterModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  filterOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterOptionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    margin: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterSelectedOption: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#111827',
  },
  filterSelectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  filterActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  filterActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  progressContainer: {
    position: 'relative',
    width: 200,
    height: 20,
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    borderColor: COLORS.white,
    // textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
