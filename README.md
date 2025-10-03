## Pull SQLITE DB

adb shell run-as com.rev cp databases/mydb.db /sdcard/mydb.db
adb pull /sdcard/mydb.db ./mydb.db

adb pull /storage/emulated/0/Download/leo.db ./mydb.db