# ProGuard rules for SMS Router
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}
-keep class com.smsrouter.app.** { *; }
