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
  Image
} from 'react-native';
import { realmContext } from '../RealmContext';
import { Betting, Combinations, Draws, Users } from '../Models';
import SelectDropdown from 'react-native-select-dropdown';
import { COLORS, icons, SIZES } from '../constants';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment-timezone';
import SortIcon from 'react-native-vector-icons/Octicons';

const { useQuery, useRealm } = realmContext;
const sortOptions = [
  'Digit (Largest first)',
  'Digit (Smallest first)',
  'Straight Limit (Largest first)',
  'Straight Limit (Smallest first)',
  'Ramble Limit (Largest first)',
  'Ramble Limit (Smallest first)',
];

const filterOptions = [
  'Premutation Set',
  'Combination Picks',
  'Hot Numbers',
  'Cold Numbers'
]

const screenWidth = Dimensions.get('window').width;

const { height } = Dimensions.get('window');

// Helper function to paginate any array
const paginateData = (data, page, limit) => {
  const startIndex = (page - 1) * limit;
  return data.slice(startIndex, startIndex + limit);
};

const CombinationsScreen = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current; // start fully visible
  const dispatch = useDispatch();
  const realm = useRealm();
  const combinationsArray = useQuery(Combinations);
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const [date, setDate] = useState(new Date());
  const [editingId, setEditingId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [tempValues, setTempValues] = useState({ straightLimit: '', rambleLimit: '', maxLimit: '', digit: '' });
  const limitPerPage = 10;
  const [page, setPage] = useState(1);
  const [bettingsPage, setBettingsPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('Show all')
  const [filterModal, setFilterModal] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('Permutation Set');
  const [selectedSort, setSelectedSort] = useState(sortOptions[0]);

  const scrollOffset = useRef(0);
  const translateY = useRef(new Animated.Value(0)).current;
  
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();

  const sortedData = useMemo(() => {
    const getSortKeyAndOrder = (option: string) => {
      const map = {
        'Digit (Largest first)': { key: 'digit', order: 'desc' },
        'Digit (Smallest first)': { key: 'digit', order: 'asc' },
        'Straight Limit (Largest first)': { key: 'straightLimit', order: 'desc' },
        'Straight Limit (Smallest first)': { key: 'straightLimit', order: 'asc' },
        'Ramble Limit (Largest first)': { key: 'rambleLimit', order: 'desc' },
        'Ramble Limit (Smallest first)': { key: 'rambleLimit', order: 'asc' },
      };
      return map[option];
    };

    const { key, order } = getSortKeyAndOrder(selectedSort);
    const data = [...combinationsArray];

    return data.sort((a, b) => {
      const aVal = typeof a[key] === 'string' ? parseInt(a[key]) : a[key];
      const bVal = typeof b[key] === 'string' ? parseInt(b[key]) : b[key];
      return order === 'asc' ? aVal - bVal : bVal - aVal;`1c`
    });
  }, [combinationsArray, selectedSort]);

  const paginatedData = useMemo(() => paginateData(sortedData, page, limitPerPage), [sortedData, page]);
  const totalPages = Math.ceil(sortedData.length / limitPerPage);

  const handleUpdateField = (item, values) => {
    realm.write(() => {
      item.straightLimit = parseInt(values.straightLimit);
      item.rambleLimit = parseInt(values.rambleLimit);
      item.maxLimit = parseInt(values.maxLimit);
    });
    setModalVisible(false);
  };

  let collectorName = selectedUser ? selectedUser : collector;

  const users = useQuery(Users, user => user.filtered('email == $0', collectorName), [collectorName]);
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

  const bettings = useQuery(Betting, data => {
    let userNow = users[0] ? users[0]._id : "";
    return data.filtered('ANY uplines == $0 && isDeleted == false && inputType == "normal" && timestamp >= $1 && timestamp <= $2 && gameTime == $3', String(userNow), startOfDay, endOfDay, curGameTime).sorted('timestamp');
  }, [user]);

  const paginatedBettings = useMemo(() => paginateData(bettings, bettingsPage, limitPerPage), [bettings, bettingsPage]);
  const totalBettingPages = Math.ceil(bettings.length / limitPerPage);

  const handleScroll = (e) => {
    const currentOffset = e.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

    scrollOffset.current = currentOffset;

    Animated.timing(translateY, {
      toValue: direction === 'down' ? -100 : 0, // hide: move up; show: move down
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

const toggleSelection = (item: string) => {

  console.log(item, "ITEM HA TOGGLE")
  
  // return
  setSelectedCategory(prev => (prev === item ? null : item));
};
  // };

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
  

  console.log(selectedCategory, "selectedCategoryselectedCategoryselectedCategory")
  
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%',  padding: 10
      }}
    >
      <Text style={{ color: COLORS.black,
        fontSize: 14,
        fontWeight: '600',}}>
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

                    <View style={{  width: '100%', alignItems: 'center' }}>
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
        renderItem={({ item }) =>  {
          console.log(item, "ano it itemm")
          return (
          <View style={{ width: screenWidth, flex: 1 }}>
            {item === 'Permutation Set' && (
              <>
                {/* Combination List */}
                {/* [Unchanged combination list layout and modal - omitted here for brevity since you already have it] */}
                {/* Pagination Controls for combinations */}
                {/* Your existing combination list and layout code here */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                  
{paginatedData.map((item, index) => {
  const isEditing = editingId === item._id.toString();
  const straightProgress = item?.straightLimit > 0 ? item?.straightTotal / item?.straightLimit : 0;
  const rambleProgress = item?.rambleLimit > 0 ? item?.rambleTotal / item?.rambleLimit : 0;
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
          straightLimit: item.straightLimit.toString(),
          rambleLimit: item.rambleLimit.toString(),
          maxLimit: item.maxLimit?.toString() || '0',
        });
        setModalVisible(true);
      }}
    >
      <View style={{ position: 'absolute', margin: 2, flexDirection: 'row', right: 0, top: 4 }}>
        {item.isWinTo && (
          <Text style={{ ...styles.text, fontSize: 10, fontWeight: 'bold', marginHorizontal: 4, paddingHorizontal: 10, borderRadius: SIZES.radius / 4, backgroundColor: COLORS.success500 }}>WINTO</Text>
        )}
      </View>

      <View key={item._id.toString()} style={{ ...styles.card, alignItems: 'flex-start' }}>
        <Text style={{ ...styles.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>{item.digit.split('').join('-')}</Text>

        {isEditing ? (
          <>
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
              <Text style={styles.text}>Straight Limit:</Text>
              <TextInput
                style={styles.input}
                placeholder='Straight Limit'
                defaultValue={item.straightLimit.toString()}
                keyboardType="numeric"
                onChangeText={(text) => handleUpdateField(item._id.toString(), 'straightLimit', text)}
              />
            </View>

            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
              <Text style={styles.text}>Ramble Limit: </Text>
              <TextInput
                style={styles.input}
                placeholder='Ramble Limit'
                defaultValue={item.rambleLimit.toString()}
                keyboardType="numeric"
                onChangeText={(text) => handleUpdateField(item._id.toString(), 'rambleLimit', text)}
              />
            </View>

            <Text style={styles.text}>Winto: {item.isWinTo ? '✅ True' : '❌ False'}</Text>
          </>
        ) : (
          <>
            <View style={{ marginVertical: 10, flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
              <View style={{ flexDirection: 'column', width: '50%', alignItems: 'flex-start' }}>
                <Text style={{ ...styles.text, color: COLORS.black }}>
                  Straight Limit: {Number(item.straightLimit).toFixed(2)}
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
                  <Text style={{...styles.progressText, right: straightPercentage == '100' ? 20 : 0, paddingLeft: straightPercentage == '100' ? 0 : 10, textAlign: straightPercentage == '100' ? 'center' : 'left' }}>{straightPercentage == '100' ? 'MAX' : `Straight Total: ${straightPercentage}%`}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'column', width: '50%', alignItems: 'flex-start' }}>
                <Text style={{ ...styles.text, color: COLORS.black }}>
                  Ramble Limit: {Number(item.rambleLimit).toFixed(2)}
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
                  <Text style={{...styles.progressText, right: ramblePercentage == '100' ? 20 : 0, paddingLeft: ramblePercentage == '100' ? 0 : 10, textAlign: ramblePercentage == '100' ? 'center' : 'left'}}>{ramblePercentage == '100' ? 'MAX' : `Ramble total: ${ramblePercentage}%`}</Text>
                </View>
              </View>
            </View>

            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>


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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
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
            style={{ fontWeight: 'bold', fontSize: 12, color: item?.riskLevel == 'cold' ? COLORS.primaryTransparent1 : COLORS.transparentRed}}
          >
          {item?.riskLevel === 'cold' ? " COLD NUMBER" : " HOT NUMBER"}
          </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
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
})}

                </ScrollView>
                {/* Modal */}
                <Modal visible={modalVisible} transparent animationType="fade">
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Edit Combination: {tempValues?.digit}</Text>
                      {['straightLimit', 'rambleLimit', 'maxLimit'].map((field) => (
                        <>
                          <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: 'bold' }}>{field == 'straightLimit' ? 'Straight Limit:' : field == 'rambleLimit' ? 'Ramble Limit:' : field == 'maxLimit' ? 'Max Limit:' : null}</Text>
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
                          onPress={() => handleUpdateField(editingItem, tempValues)}>
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
                    <View key={betting._id} style={{ ...styles.ticketContainer, marginVertical: 10, borderWidth: 1, borderRadius: SIZES.radius / 3, padding: 12, backgroundColor: COLORS.gray300, borderColor: COLORS.gray400, elevation: 2 }}>
                      <Text style={styles.ticketHeader}>Ticket No: {betting.ticketNo}</Text>
                      {betting.combinations.map((combo) => (
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
                  ))}
                </ScrollView>
                
              </>
            )}
          </View>
        )}}
      />
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
                    <Modal visible={filterModal} transparent animationType="fade">
      <View style={styles.filterOverlay}>
        <View style={styles.filterModalContainer}>
          <Text style={styles.filterSectionTitle}>Category</Text>
          <View style={styles.filterOptionWrap}>
  {filterOptions.map((item) => (
    <TouchableOpacity
      key={item}
      // onPress={() => {
      //   setSelectedCategory((prev) => (prev === item ? null : item));
      // }}
      onPress={() => toggleSelection(item)}
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
                onPress={() => toggleSelection(item)}
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
              style={[styles.filterActionButton, { backgroundColor: '#9ca3af' }]}
              onPress={() => setFilterModal(false)}
            >
              <Text style={styles.filterActionText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterActionButton, { backgroundColor: '#2563eb' }]}
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

const styles = StyleSheet.create({
  // keep your current styles here
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

export default CombinationsScreen;