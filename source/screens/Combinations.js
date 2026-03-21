// NOTE: This is a direct logical replacement of Realm usage with Redux selectors & actions.
// UI, pagination, sorting, filtering, progress bars, modals, animations are preserved.

import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as Progress from 'react-native-progress';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment-timezone';
import SortIcon from 'react-native-vector-icons/Octicons';
import {
  fetchDraws,
  fetchMasterCombinations,
  updateMasterCombination,
} from '../redux/actions/bettingActions';
import { COLORS, SIZES } from '../constants';
import supabase from '../utils/supabaseClient';
import { fetchBettings } from '../utils/offlineSync';
// import { fet, SIZESchDrawsByDate } from '../redux/actions/drawActions';
const screenWidth = Dimensions.get('window').width;
const limitPerPage = 10;

const sortOptions = [
  'Digit (Largest first)',
  'Digit (Smallest first)',
  'Straight Limit (Largest first)',
  'Straight Limit (Smallest first)',
  'Ramble Limit (Largest first)',
  'Ramble Limit (Smallest first)',
];

const filterOptions = [
  'Permutation Set',
  'Hot Numbers',
  'Cold Numbers',
];

const paginateData = (data, page, limit) => {
  const start = (page - 1) * limit;
  return data.slice(start, start + limit);
};

const CombinationsScreen = () => {
  const dispatch = useDispatch();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState(sortOptions[0]);
  const [selectedCategory, setSelectedCategory] = useState('Permutation Set');
  const [filterModal, setFilterModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [tempValues, setTempValues] = useState({ straight_limit: '', ramble_limit: '', straight_max_limit: '', ramble_max_limit: '', digit: '' });
  const [draws, setDraws] = useState([]);
  const [masterCombinations, setMasterCombinations] = useState([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [editingId, setEditingId] = useState('');
  const limitPerPage = 10;
  const today = moment().tz('Asia/Manila').format('YYYY-MM-DD')

  let filterObj = {}


  let curGameTime = getTimeRange();

  const sortedData = useMemo(() => {
    const getSortKeyAndOrder = (option: string) => {
      const map = {
        'Digit (Largest first)': { key: 'digit', order: 'desc' },
        'Digit (Smallest first)': { key: 'digit', order: 'asc' },
        'Straight Limit (Largest first)': { key: 'straight_limit', order: 'desc' },
        'Straight Limit (Smallest first)': { key: 'straight_limit', order: 'asc' },
        'Ramble Limit (Largest first)': { key: 'ramble_limit', order: 'desc' },
        'Ramble Limit (Smallest first)': { key: 'ramble_limit', order: 'asc' },
      };
      return map[option];
    };

    const { key, order } = getSortKeyAndOrder(selectedSort);
    const data = [...masterCombinations];

    return data.sort((a, b) => {
      const aVal = typeof a[key] === 'string' ? parseInt(a[key]) : a[key];
      const bVal = typeof b[key] === 'string' ? parseInt(b[key]) : b[key];
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [masterCombinations, selectedSort]);

  const paginatedData = useMemo(() => paginateData(sortedData, page, limitPerPage), [sortedData, page]);
  const totalPages = Math.ceil(sortedData.length / limitPerPage);


  const loadData = async (isRefresh = false) => {
    filterObj.gameTime = curGameTime;
    filterObj.includeAll = true;
    
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const permutations = await dispatch(fetchMasterCombinations());
      const drawsData = await dispatch(fetchDraws());
      
      const bettingsData = await await dispatch(fetchBettings({input_type: 'normal'}));



      console.log(bettingsData, "BETTINGS ARRAY IS HERE!")

      setMasterCombinations(permutations || []);
      setDraws(drawsData || []);
    } catch (err) {
      console.log('Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.1, duration: 3000, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  const handleSaveEdit = (editingItem, tempValues) => {
    if (!editingItem) return;

    dispatch(updateMasterCombination(editingItem.id, {
      straight_limit: Number(tempValues.straight_limit),
      ramble_limit: Number(tempValues.ramble_limit),
      straight_max_limit: Number(tempValues.straight_max_limit),
      ramble_max_limit: Number(tempValues.ramble_max_limit)
    }));

    setModalVisible(false);
  };

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

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1); // optional: reset pagination
    await loadData(true);
    setRefreshing(false);
  };

  const toggleSwitch = () => setIsEnabled(previousState => !previousState);



// useEffect(() => {
//   const channel = supabase
//     .channel('today-draws')
//     .on(
//       'postgres_changes',
//       {
//         event: '*',
//         schema: 'public',
//         table: 'draws',
//         filter: `draw_date=eq.${today}`
//       },
//       (payload) => {
//           console.log('🚀 Draw updated:', payload)

//         // Update your UI or redux state
//         // fetchDraws()
//       }
//     )
//     .subscribe()

//   return () => {
//     supabase.removeChannel(channel)
//   }

// }, [])

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

      <View
        style={{
          ...styles.controls,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          width: '100%',
        }}>

        <View style={{ width: '100%', alignItems: 'center' }}>
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
      </View>

      <FlatList
        // data={[{ key: 'Permutation Set' }, { key: 'combinations' }]}
        data={[selectedCategory]}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.secondary]}   // Android spinner
            tintColor={COLORS.secondary}  // iOS spinner
          />
        }
        renderItem={({ item }) => {
          return (
            <View style={{ width: screenWidth, flex: 1 }}>
              {item === 'Permutation Set' && (
                <>
                  {/* Combination List */}
                  {/* [Unchanged combination list layout and modal - omitted here for brevity since you already have it] */}
                  {/* Pagination Controls for combinations */}
                  {/* Your existing combination list and layout code here */}
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.container}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadData(true)}
                        colors={[COLORS.secondary]}
                        tintColor={COLORS.secondary}
                      />
                    }
                  >

                    {loading && (
                      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.secondary} />
                        <Text style={{ marginTop: 10, color: COLORS.gray600 }}>
                          Loading combinations...
                        </Text>
                      </View>
                    )}

                    {!loading && paginatedData.length === 0 && (
                      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.gray600, fontSize: 14 }}>
                          No combinations available
                        </Text>
                      </View>
                    )}

                    {
                      !loading && (
                        paginatedData.map((item, index) => {
                          const isEditing = editingId === item.id.toString();
                          const straightProgress = item?.straight_limit > 0 ? item?.straight_total / item?.straight_limit : 0;
                          const rambleProgress = item?.ramble_limit > 0 ? item?.ramble_total / item?.ramble_limit : 0;
                          const straightPercentage = Math.min(Math.round(straightProgress * 100), 100);
                          const ramblePercentage = Math.min(Math.round(rambleProgress * 100), 100);
                          const backgroundColor = index % 2 === 0 ? '#f3f3f3ff' : COLORS.gray200;

                          return (
                            <TouchableOpacity
                              style={{
                                width: '100%',
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                                backgroundColor: backgroundColor,
                                marginBottom: 4,
                                padding: 10,
                              }}
                              onLongPress={() => {
                                setEditingItem(item);
                                setTempValues({
                                  digit: item?.digit.toString(),
                                  straight_limit: item.straight_limit.toString(),
                                  ramble_limit: item.ramble_limit.toString(),
                                  straight_max_limit: item.straight_max_limit?.toString(),
                                  ramble_max_limit: item.ramble_max_limit?.toString(),
                                });
                                setModalVisible(true);
                              }}
                            >
                              <View style={{ position: 'absolute', margin: 2, flexDirection: 'row', right: 0, top: 4 }}>
                                {item.is_win_to && (
                                  <Text style={{ ...styles.text, fontSize: 10, fontWeight: 'bold', marginHorizontal: 4, paddingHorizontal: 10, borderRadius: SIZES.radius / 4, backgroundColor: COLORS.success500 }}>WINTO</Text>
                                )}
                              </View>

                              <View key={item.id.toString()} style={{ ...styles.card, alignItems: 'flex-start' }}>
                                <Text style={{ ...styles.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>{item.digit.split('').join('-')}</Text>

                                {isEditing ? (
                                  <>
                                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                      <Text style={styles.text}>Straight Limit:</Text>
                                      <TextInput
                                        style={styles.input}
                                        placeholder='Straight Limit'
                                        defaultValue={item.straight_limit.toString()}
                                        keyboardType="numeric"
                                        onChangeText={(text) => handleSaveEdit(item.id.toString(), 'straight_limit', text)}
                                      />
                                    </View>

                                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                      <Text style={styles.text}>Ramble Limit: </Text>
                                      <TextInput
                                        style={styles.input}
                                        placeholder='Ramble Limit'
                                        defaultValue={item.ramble_limit.toString()}
                                        keyboardType="numeric"
                                        onChangeText={(text) => handleSaveEdit(item.id.toString(), 'ramble_limit', text)}
                                      />
                                    </View>

                                    <Text style={styles.text}>Winto: {item.is_win_to ? '✅ True' : '❌ False'}</Text>
                                  </>
                                ) : (
                                  <>
                                    <View style={{ marginVertical: 10, flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
                                      <View style={{ flexDirection: 'column', width: '50%', alignItems: 'flex-start' }}>
                                        <Text style={{ ...styles.text, color: COLORS.black }}>
                                          Straight Limit: {Number(item.straight_limit).toFixed(2)}
                                        </Text>

                                        <View style={{ flexDirection: 'column', width: '100%' }}>
                                          <Progress.Bar
                                            progress={straightProgress}
                                            width={190}
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
                                          Ramble Limit: {Number(item.ramble_limit).toFixed(2)}
                                        </Text>

                                        <View style={{ flexDirection: 'column', width: '100%' }}>
                                          <Progress.Bar
                                            progress={rambleProgress}
                                            width={190}
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
                                          {item?.win_frequency}
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
                                          // backgroundColor: item?.risk_level === 'cold' ? COLORS.primary : COLORS.transparentRed,
                                          // borderRadius: SIZES.radius / 4,
                                        }}>
                                          Risk Level:
                                        </Text>
                                        <Text
                                          style={{ fontWeight: 'bold', fontSize: 12, color: item?.risk_level == 'cold' ? COLORS.primaryTransparent1 : COLORS.transparentRed }}
                                        >
                                          {item?.risk_level === 'cold' ? " COLD NUMBER" : " HOT NUMBER"}
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
                                          N/A
                                        </Text>
                                      </View>

                                    </View>

                                  </>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        }))}

                  </ScrollView>
                  {/* Modal */}
                  <Modal visible={modalVisible} transparent animationType="fade">
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <View style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: 'row', width: '100%' }}>
                          <Text style={{ ...styles.modalTitle, borderWidth: 1, }}>Edit Combination: {tempValues?.digit}</Text>
                          <Switch
                            trackColor={{ false: "#767577", true: COLORS.secondary }}
                            thumbColor={isEnabled ? COLORS.white : "#f4f3f4"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                          />

                        </View>
                        {['straight_limit', 'ramble_limit', 'straight_max_limit', 'ramble_max_limit'].map((field) => (
                          <>
                            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: 'bold' }}>{field == 'straight_limit' ? 'Straight Limit:' : field == 'ramble_limit' ? 'Ramble Limit:' : field == 'straight_max_limit' ? 'Straight Max Limit:' : field == 'ramble_max_limit' ? 'Ramble Max Limit:' : null}</Text>
                            <TextInput
                              key={field}
                              style={styles.modalInput}
                              keyboardType="numeric"
                              placeholder={field}
                              value={tempValues[field]}
                              onChangeText={(text) => setTempValues({ ...tempValues, [field]: text })}
                            />
                          </>
                        ))}
                        <View style={{ ...styles.modalActions, width: '100%' }}>
                          <Pressable
                            style={{
                              backgroundColor: COLORS.gray400,
                              width: '40%',
                              paddingVertical: 8,
                              paddingHorizontal: 16,
                              borderRadius: 12,
                            }}
                            onPress={() => setModalVisible(false)}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center' }}>CANCEL</Text>
                          </Pressable>
                          <Pressable
                            style={{
                              backgroundColor: COLORS.secondary,
                              paddingVertical: 8,
                              width: '40%',
                              paddingHorizontal: 16,
                              borderRadius: 12,
                            }}
                            onPress={() => handleSaveEdit(editingItem, tempValues)}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white, textAlign: 'center' }}>SAVE</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Modal>
                  {/* <View style={styles.pagination}>
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
                  </View> */}

                </>
              )}

              {
                item == 'Combination Picks' && (
                  <>
                    {/* Paginated Bettings List */}
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                      {/* <Text style={styles.title}>Bettings List</Text> */}
                      {paginatedBettings.map((betting) => (
                        <View key={betting.id} style={{ ...styles.ticketContainer, marginVertical: 10, borderWidth: 1, borderRadius: SIZES.radius / 3, padding: 12, backgroundColor: COLORS.gray300, borderColor: COLORS.gray400, elevation: 2 }}>
                          <Text style={styles.ticketHeader}>Ticket No: {betting.ticketNo}</Text>
                          {betting.combinations.map((combo) => (
                            <View key={combo.id} style={{ marginTop: SIZES.padding / 2 }}>
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
                      ))}
                    </ScrollView>

                  </>
                )}
            </View>
          )
        }}
      />
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => setPage(page - 1)}
          disabled={page === 1 || loading}
          style={[styles.pageButton, (page === 1 || loading) && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>

        <Text style={{ ...styles.pageNumber, color: COLORS.black }}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          onPress={() => setPage(page + 1)}
          disabled={page === totalPages || loading}
          style={[styles.pageButton, (page === totalPages || loading) && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={filterModal} transparent animationType="fade">
        <View style={styles.filterOverlay}>
          <View style={styles.filterModalContainer}>
            <Text style={{ color: COLORS.black900, fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
              Data Filters
            </Text>
            <View style={{ backgroundColor: COLORS.black900, width: '100%', height: .5, marginBottom: 10 }} />
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.filterOptionWrap}>
              {filterOptions.map((item) => (
                <TouchableOpacity
                  key={item}
                  // onPress={() => {
                  //   setSelectedCategory((prev) => (prev === item ? null : item));
                  // }}
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
              {sortOptions.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedSort(item)}
                  style={[
                    styles.filterOptionButton,
                    selectedSort === item && styles.filterSelectedOption
                  ]}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedSort === item && styles.filterSelectedText
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterActionButton, { backgroundColor: COLORS.white, borderColor: COLORS.secondary, borderWidth: 1 }]}
                onPress={() => setFilterModal(false)}
              >
                <Text style={{ ...styles.filterActionText, color: COLORS.secondary }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterActionButton, { backgroundColor: COLORS.secondary }]}
                onPress={() => {
                  // Apply logic here using selectedCategory and selectedSort
                  console.log('Applied:', { selectedCategory, selectedSort });
                  setFilterModal(false);
                }}
              >
                <Text style={styles.filterActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

};

// const styles = StyleSheet.create({
//   card: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
//   digit: { fontSize: 20, fontWeight: 'bold' },
//   meta: { fontSize: 12 },
//   controls: { padding: 10, alignItems: 'flex-end' },
//   pagination: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
//   modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
//   modalContent: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 10 },
//   modalInput: { borderWidth: 1, marginVertical: 6, padding: 6 },
//   filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
//   filterModalContainer: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
// });
const styles = StyleSheet.create({
  // keep your current styles here
  container: {
    // padding: 10,
    alignItems: 'stretch',
    // width: '100%',
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
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
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
    padding: 18,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 4,
    color: COLORS.black500
  },
  filterOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterOptionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 26,
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


export default CombinationsScreen;