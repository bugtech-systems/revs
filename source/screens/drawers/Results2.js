import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, TextInput, Image, Button, SafeAreaView, Modal } from 'react-native'
import { COLORS } from '../../constants/theme';
import { realmContext } from '../../RealmContext';
import { Draws, Combinations } from '../../Models';
import moment from 'moment-timezone';
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';


const { useRealm, useQuery } = realmContext;

export default function Results2({ navigation }) {
	const today = moment().tz('Asia/Manila').toDate();
	let startDate = moment(today).startOf('day').toDate();
	// const items = useQuery(Betting);
	const draws = useQuery(Draws, draw => draw.sorted('drawDate', true))
	  // 👇 Get all winning combinations
	const winningCombinations = useQuery(
		Combinations,
		q => q.filtered('isWinTo == true'),
		[]
	);

	// Convert to a Set for fast lookup
	const winningDigits = new Set(
		winningCombinations.map(c => String(c.digit))
	);

	function renderHeaderDatePicker() {
		return (
			<>

				<View style={{ flexDirection: 'row', borderTopWidth: 1, justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: COLORS.gray600, backgroundColor: COLORS.gray400 }}>
					<Text style={{ ...styles.rowHeader, width: '40%' }}>
						DATE
					</Text>
					<Text style={{ ...styles.rowHeader, width: '20%', color: '#3897e7' }}>
						2PM
					</Text>
					<Text style={{ ...styles.rowHeader, width: '20%', color: '#ff9d3e' }}>
						5PM
					</Text>
					<Text style={{ ...styles.rowHeader, width: '20%', color: COLORS.black600 }}>
						9PM
					</Text>
				</View>
			</>

		)
	}

	function renderList({ item, index }) {
		const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
		return (
			<Animated.View
				entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
				exiting={FadeOutDown.delay(index * 100).duration(500)}
			>
				<TouchableOpacity
					onPress={() => navigation.navigate('ViewTip', { resultDate: item.date })}
					style={{
						flexDirection: 'row',
						alignItems: 'flex-start',
						justifyContent: 'space-around',
						paddingVertical: 14,
						backgroundColor: backgroundColor,
						width: '100%'
					}}
				>
					<Text style={{ ...styles.rowHeader, paddingHorizontal: 10, width: '40%', color: index ? COLORS.black : '#1a90ff', }}>
						{moment(item.date).isSame(startDate) ? 'Today' : moment(item.date).format('MM/DD/YYYY')}
					</Text>
					{[0, 1, 2].map((game, i) => {
						let draw = item.draws[game];
						// 👇 Check if this draw digit is in winning combinations
						const isWinningDigit =
						draw?.digit && winningDigits.has(String(draw.digit));
						return (
							<Text key={Math.random()} style={{ ...styles.rowHeader, width: '20%', color: isWinningDigit ? COLORS.danger : index ? COLORS.black : '#1a90ff', }}>
								{(draw && draw.digit) ? String(draw.digit).split('').join('-') : '_-_-_'}
							</Text>
						)
					})}

				</TouchableOpacity>
			</Animated.View>

		)
	}


	const groups = draws.reduce((groups, draw) => {
		const date = moment(draw.drawDate).format('YYYY-MM-DD');
		if (!groups[date]) {
			groups[date] = [];
		}
		groups[date].unshift({ digit: draw.combination, isWinTo: draw.isWinTo });
		return groups;
	}, {});

	// Edit: to add it in the array format instead
	const groupArrays = Object.keys(groups).map((date, index) => {
		return {
			date,
			index,
			draws: groups[date]
		};
	});


	return (
		<SafeAreaView style={styles.wrapper}>
			{renderHeaderDatePicker()}
			<FlatList
				showsVerticalScrollIndicator={false}
				data={groupArrays}
				scrollEnabled
				keyExtractor={(item) => item.index}
				// contentContainerStyle={{ borderWidth: 1, borderColor: COLORS.white, elevation: 10, backgroundColor: COLORS.white }}
				renderItem={renderList}
				ListEmptyComponent={
					<View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
						<Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
							No records found.
						</Text>
					</View>
				}
				ListFooterComponent={
					groupArrays.length > 0 &&
					<View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
						<Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
							End of results.
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		padding: 10,
		backgroundColor: COLORS.gray300
	},
	container: {
		// height: '15%', // Adjust height as needed
		// flexGrow: 1,
		// height: '10%',
		flex: 1,
		width: '100%',
		padding: 10,
		alignItems: 'center',
		justifyContent: 'flex-start'
		// borderWidth: 1
	},
	errorField: {
		borderColor: 'red',
		color: 'red'
	},
	rowHeader: {
		color: COLORS.black,
		fontWeight: 'bold',
		fontSize: 18,
		// borderWidth: 1

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