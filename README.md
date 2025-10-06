## Pull SQLITE DB

adb shell run-as com.rev cp databases/mydb.db /sdcard/mydb.db
adb pull /sdcard/mydb.db ./mydb.db

adb pull /storage/emulated/0/Download/leo.db ./mydb.db


# 📱 Generate Debug APK in React Native CLI

Follow the steps below to manually build and generate a **debug APK** for your React Native Android project.

---

## 🧩 Step 1: Generate the JavaScript Bundle

From your project **root directory**, run the following command:

```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
```

> 💡 This command bundles your JavaScript code and copies all images and assets into the Android `res` folder.

---

## 📂 Step 2: Navigate to the Android Directory

Change into the Android project directory:

```bash
cd android
```

---

## ⚙️ Step 3: Build the Debug APK

Run the Gradle command to assemble a **debug APK**:

```bash
./gradlew assembleDebug
```

> 🧱 Once the build completes successfully, your debug APK will be located at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 Step 4: Install the APK (Optional)

You can install the generated APK on your connected Android device or emulator using:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

✅ **You’re done!**  
Your debug APK is now ready for local testing on Android devices.

