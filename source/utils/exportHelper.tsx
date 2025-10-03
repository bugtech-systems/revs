import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const DB_NAME = 'app.db';

// Detect actual DB path based on platform + default location
function getDbPath() {
  if (Platform.OS === 'ios') {
    // iOS default = Library/LocalDatabase/
    return `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
  } else {
    // Android default = /data/data/<package-name>/databases/
    return `/data/data/com.rev/databases/${DB_NAME}`;
  }
}

export async function exportDatabase() {
  try {
    const dbPath = getDbPath();
    const destPath =
      Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${DB_NAME}`
        : `${RNFS.DownloadDirectoryPath}/${DB_NAME}`;

    const exists = await RNFS.exists(dbPath);
    if (!exists) {
      console.log('❌ Database file not found at:', dbPath);
      return;
    }

    // Copy DB to public directory
    await RNFS.copyFile(dbPath, destPath);
    console.log(`✅ DB copied to: ${destPath}`);

    // Open share sheet
    await Share.open({
      title: 'Export SQLite DB',
      url: 'file://' + destPath,
      type: 'application/octet-stream',
      failOnCancel: false,
    });

    console.log('✅ Database shared successfully');
  } catch (error) {
    console.error('❌ Failed to export DB:', error);
  }
}
