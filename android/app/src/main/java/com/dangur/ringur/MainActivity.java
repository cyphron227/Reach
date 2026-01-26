package com.dangur.ringur;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge display so safe area insets are exposed to web content
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Make status bar transparent
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);

        // Set light status bar icons (dark icons on light background)
        View decorView = window.getDecorView();
        WindowCompat.getInsetsController(window, decorView).setAppearanceLightStatusBars(true);
    }
}
