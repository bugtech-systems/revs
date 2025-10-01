import PushNotification, { Importance } from 'react-native-push-notification';
import NotificationHandler from './NotificationHandler';

export default class NotifService {
  constructor(onRegister, onNotification) {

    NotificationHandler.attachRegister(onRegister);
    NotificationHandler.attachNotification(onNotification);

    // Clear badge at the start
    PushNotification.getApplicationIconBadgeNumber((number) => {
      if (number > 0) {
        PushNotification.setApplicationIconBadgeNumber(0);
      }
    });
  }

  createDefaultChannels() {
    PushNotification.createChannel(
      {
        channelId: '666999',
        channelName: 'Revs',
        channelDescription: 'A default channel',
        importance: Importance.HIGH,
        playSound: true,
        soundName: 'notification1.mp3'
      },
      (created) => console.log(`createChannel '666999' returned '${created}'`)
    );
  }

  localNotif(soundName) {
    PushNotification.localNotification({
      channelId: '666999',
      title: 'Local Notification',
      message: 'My Notification Message',
      userInfo: { screen: 'home' },
      playSound: true,
      soundName: 'notification1.mp3',
      actions: ['Accept'],
    });
  }
  

  /* scheduleNotif(soundName) {
    this.lastId++;
    PushNotification.localNotificationSchedule({
      date: new Date(Date.now() + 30 * 1000), // 30 seconds from now
      channelId: '666999',
      title: 'Scheduled Notification',
      message: 'My Notification Message',
      importance: Importance.HIGH,
      userInfo: { screen: 'home' },
      playSound: true,
      soundName: 'notification1.mp3',
      actions: ['Yes', 'No'],
    });
  } */
    cancelAllNotif() {
    
      PushNotification.cancelAllLocalNotifications();

    }
 
 
    scheduleNotif(soundName) {
  
      // Array of notification times in hours and minutes
      const notificationTimes = [
          // { hour: 19, minute: 40, gameTime: '2PM' }, // 1:40 PM
          // { hour: 19, minute: 42, gameTime: '5PM' }, // 1:40 PM
          // { hour: 19, minute: 45, gameTime: '9PM' }, // 1:40 PM

        
          { hour: 13, minute: 40, gameTime: '2PM' }, // 1:40 PM
          { hour: 16, minute: 40, gameTime: '5PM' }, // 4:40 PM
          { hour: 20, minute: 40, gameTime: '9PM' } // 8:40 PM
      ];
  
      notificationTimes.forEach(time => {
          const now = new Date();
          const notificationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0);
  
          // If the notification time is earlier than the current time, schedule for the next day
          if (notificationDate < now) {
              notificationDate.setDate(notificationDate.getDate() + 1);
          }
          
  
          // console.log(notificationDate,"NOTIF DATE!")
          // console.log(now,"NOW!")

  
          PushNotification.localNotificationSchedule({
              date: notificationDate, // Scheduled time
              // date: new Date(Date.now() + 30 * 1000), // 30 seconds from now
              channelId: '666999',
              title: `Sold-out Reminder for ${time.gameTime}`,
              message: 'Please check available Revs Tickets.',
              importance: Importance.HIGH,
              userInfo: { screen: 'home' },
              playSound: true,
              soundName: 'notification1.mp3',
              actions: ['Accept'],
              repeatType: 'time',
              repeatTime: 24 * 60 * 60 * 1000 // Repeat every 24 hours (1 day) in milliseconds
          });
      });
      return
  }
}