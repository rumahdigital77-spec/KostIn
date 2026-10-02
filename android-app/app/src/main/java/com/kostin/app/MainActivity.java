package com.kostin.app;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.graphics.Color;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.*;
import android.widget.*;
import android.content.Intent;
import android.net.Uri;

public class MainActivity extends Activity {
    WebView webView;
    FrameLayout root;

    @Override
    public void onCreate(Bundle b) {
        super.onCreate(b);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(6, 43, 87));
        ImageView splash = new ImageView(this);
        splash.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        try {
            byte[] data = Base64.decode(LogoData.BASE64, Base64.DEFAULT);
            splash.setImageBitmap(BitmapFactory.decodeByteArray(data, 0, data.length));
        } catch (Exception ignored) {}
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        new Handler().postDelayed(() -> openApp(splash), 900);
    }

    void openApp(ImageView splash) {
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, String u) {
                if (u.startsWith("https://kost-in-three.vercel.app/") || u.startsWith("https://kost-in-tau.vercel.app/")) {
                    v.loadUrl(u); return true;
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception ignored) {}
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        webView.loadUrl("https://kost-in-three.vercel.app/");
        root.removeView(splash);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}